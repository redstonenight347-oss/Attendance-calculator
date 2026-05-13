import { fetchMonthlyLogsApi, saveAttendanceLogApi } from './api.js';
import { getUserId, formatDate } from './utils.js';
import { getPeriodsData } from './timetable.js';
import { Storage } from './storage.js';
import { debounceSync } from './sync.js';
import { calculateNewStats } from './calculator.js';

let currentViewDate = new Date();
let selectedDate = new Date();
let attendanceLogsCache = [];
let fetchLogsTimeout = null;
let isFetchingLogs = false;
let pendingLogsQueue = []; // Queue for bulk sync
let isSyncingAttendance = false; // True while save+fetch cycle is in progress

// Global click listener to close attendance slot action overlays when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.attendance-slot')) {
        document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
    }
});

export function initCalendar() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');

    if (prevBtn && !prevBtn.dataset.listener) {
        prevBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1);
            const userId = getUserId();
            const year = currentViewDate.getFullYear();
            const month = currentViewDate.getMonth() + 1;
            const cachedLogs = Storage.get(userId, `logs_${year}_${month}`);
            if (cachedLogs) attendanceLogsCache = cachedLogs;
            else attendanceLogsCache = [];
            renderCalendar();
            debouncedFetchLogs();
        });
        prevBtn.dataset.listener = 'true';
    }

    if (nextBtn && !nextBtn.dataset.listener) {
        nextBtn.addEventListener('click', () => {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1);
            const userId = getUserId();
            const year = currentViewDate.getFullYear();
            const month = currentViewDate.getMonth() + 1;
            const cachedLogs = Storage.get(userId, `logs_${year}_${month}`);
            if (cachedLogs) attendanceLogsCache = cachedLogs;
            else attendanceLogsCache = [];
            renderCalendar();
            debouncedFetchLogs();
        });
        nextBtn.dataset.listener = 'true';
    }

    if (prevDayBtn && !prevDayBtn.dataset.listener) {
        prevDayBtn.addEventListener('click', () => {
            const oldMonth = selectedDate.getMonth();
            const oldYear = selectedDate.getFullYear();
            selectedDate.setDate(selectedDate.getDate() - 1);
            handleDateChange(oldMonth, oldYear);
        });
        prevDayBtn.dataset.listener = 'true';
    }

    if (nextDayBtn && !nextDayBtn.dataset.listener) {
        nextDayBtn.addEventListener('click', () => {
            const oldMonth = selectedDate.getMonth();
            const oldYear = selectedDate.getFullYear();
            selectedDate.setDate(selectedDate.getDate() + 1);
            handleDateChange(oldMonth, oldYear);
        });
        nextDayBtn.dataset.listener = 'true';
    }

    const userId = getUserId();
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1;
    const cachedLogs = Storage.get(userId, `logs_${year}_${month}`);
    if (cachedLogs) {
        attendanceLogsCache = cachedLogs;
    }

    renderCalendar();
    debouncedFetchLogs();
    renderDayAttendance();
}

function handleDateChange(oldMonth, oldYear) {
    const newMonth = selectedDate.getMonth();
    const newYear = selectedDate.getFullYear();
    if (oldMonth !== newMonth || oldYear !== newYear) {
        currentViewDate = new Date(newYear, newMonth, 1);
        const userId = getUserId();
        const cachedLogs = Storage.get(userId, `logs_${newYear}_${newMonth + 1}`);
        if (cachedLogs) attendanceLogsCache = cachedLogs;
        renderCalendar();
        debouncedFetchLogs();
    } else {
        renderDayAttendance();
    }
}

export function debouncedFetchLogs() {
    if (fetchLogsTimeout) clearTimeout(fetchLogsTimeout);
    fetchLogsTimeout = setTimeout(() => fetchMonthlyLogs(), 400);
}



async function fetchMonthlyLogs() {
    const userId = getUserId();

    if (!userId) return;
    
    // If a sync (save+fetch) is already in progress, skip this background fetch.
    // The sync's own fetchMonthlyLogs call (via _fetchMonthlyLogsInternal) will handle it.
    if (isSyncingAttendance) {
        console.log('[Sync] Skipping background fetch — sync in progress');
        return;
    }
    
    await _fetchMonthlyLogsInternal(userId);
}

async function _fetchMonthlyLogsInternal(userId) {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1;
    isFetchingLogs = true;
    try {
        const freshLogs = await fetchMonthlyLogsApi(userId, year, month);
        
        // Merge unsaved pending changes to prevent background fetch from overwriting user edits
        const protectedLogs = [...pendingLogsQueue];
        if (protectedLogs.length > 0) {
            protectedLogs.forEach(pendingLog => {
                const idx = freshLogs.findIndex(l => {
                    // Match by real DB id
                    if (pendingLog.id && !String(pendingLog.id).startsWith('temp_') && l.id === pendingLog.id) return true;
                    // Match by timetable slot (for regular classes)
                    if (pendingLog.timetableId && formatDate(l.date) === pendingLog.date && Number(l.timetable_id) === Number(pendingLog.timetableId)) return true;
                    return false;
                });
                
                if (pendingLog.status === 'clear') {
                    if (idx > -1) freshLogs.splice(idx, 1);
                } else if (idx > -1) {
                    freshLogs[idx].status = pendingLog.status;
                } else {
                    // Not found in server data — this is a new entry (likely extra class with temp_ id)
                    // Only add if it's not already represented (avoid duplicates)
                    const alreadyAdded = freshLogs.some(l => 
                        pendingLog.id && l.id === pendingLog.id
                    );
                    if (!alreadyAdded) {
                        freshLogs.push({
                            id: pendingLog.id || `temp_${Date.now()}`,
                            date: pendingLog.date,
                            subject_id: pendingLog.subjectId,
                            timetable_id: pendingLog.timetableId || null,
                            status: pendingLog.status,
                            subject_name: pendingLog.subjectName
                        });
                    }
                }
            });
        }
        
        attendanceLogsCache = freshLogs;
        Storage.save(userId, `logs_${year}_${month}`, freshLogs);
    } catch (err) {
        console.error("Error fetching logs:", err);
    } finally {
        isFetchingLogs = false;
        renderCalendar();
        renderDayAttendance();
    }
}

export function renderCalendar() {
    const calendarGrid = document.getElementById('calendarDays');
    const currentMonthLabel = document.getElementById('monthDisplay');
    if (!calendarGrid || !currentMonthLabel) return;
    
    calendarGrid.innerHTML = '';
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    currentMonthLabel.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;
        
        if (dateStr === formatDate(new Date())) dayDiv.classList.add('today');
        if (dateStr === formatDate(selectedDate)) dayDiv.classList.add('selected');
        if (date.getDay() === 0) dayDiv.classList.add('sunday');
        
        const dayLogs = attendanceLogsCache.filter(l => formatDate(l.date) === dateStr);
        const markersContainer = document.createElement('div');
        markersContainer.className = 'day-markers';
        
        // Pending check: if it's a previous day and has periods but NO logs for some periods
        const isPast = date < new Date(new Date().setHours(0,0,0,0));
        const dayPeriods = getPeriodsData()[date.toLocaleDateString('en-US', { weekday: 'long' })] || [];
        
        // Build set of subject IDs from timetable periods (to distinguish timetable logs from true extra classes)
        const timetableSubjectIds = new Set(dayPeriods.filter(p => p.name).map(p => Number(p.id)));
        
        // Extra = logs without timetable_id that also don't belong to any timetable period's subject
        let hasExtra = dayLogs.some(l => !l.timetable_id && !timetableSubjectIds.has(Number(l.subject_id)));
        let hasCancelled = dayLogs.some(l => l.status === 'cancelled');
        
        const hasPending = isPast && dayPeriods.some(p => {
            if (!p.name) return false;
            if (p.timetableId) return !dayLogs.some(l => Number(l.timetable_id) === Number(p.timetableId));
            // Unsynced period: check by subject_id
            return !dayLogs.some(l => Number(l.subject_id) === Number(p.id) && !l.timetable_id);
        });

        if (hasExtra) markersContainer.innerHTML += '<span class="marker marker-e">E</span>';
        if (hasCancelled) markersContainer.innerHTML += '<span class="marker marker-c">C</span>';
        if (hasPending) markersContainer.innerHTML += '<span class="marker marker-p">P</span>';
        
        dayDiv.appendChild(markersContainer);

        if (dayLogs.length > 0) {
            const hasAbsent = dayLogs.some(l => l.status === 'absent');
            const hasPresent = dayLogs.some(l => l.status === 'present');
            const allAbsent = dayLogs.every(l => l.status === 'absent' || l.status === 'cancelled') && hasAbsent;
            const allPresent = dayLogs.every(l => l.status === 'present' || l.status === 'cancelled') && hasPresent;
            const isMixed = hasAbsent && hasPresent;

            if (isMixed) dayDiv.classList.add('cal-mixed');
            else if (allAbsent) dayDiv.classList.add('cal-absent');
            else if (allPresent) dayDiv.classList.add('cal-present');
        }
        
        dayDiv.onclick = () => {
            selectedDate = new Date(year, month, day);
            renderCalendar();
            renderDayAttendance();
        };
        
        calendarGrid.appendChild(dayDiv);
    }
}

export function renderDayAttendance() {
    const dateDisplay = document.getElementById('selectedDateDisplay');
    const slotsWrapper = document.getElementById('daySlotsWrapper');
    if (!dateDisplay || !slotsWrapper) return;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = selectedDate.toLocaleDateString(undefined, options);
    slotsWrapper.innerHTML = '';
    const periodsData = getPeriodsData();
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySubjects = periodsData[dayName] || [];
    if (daySubjects.length === 0) {
        slotsWrapper.innerHTML = '<p style="color: #64748b; font-style: italic; padding: 20px;">No subjects scheduled.</p>';
        return;
    }
    const selectedDateStr = formatDate(selectedDate);
    const claimedLogIds = new Set(); // Track logs matched to timetable periods
    daySubjects.forEach(subject => {
        if (!subject.name) return;
        let log;
        if (subject.timetableId) {
            // Synced period — match by timetable_id
            log = attendanceLogsCache.find(l => formatDate(l.date) === selectedDateStr && Number(l.timetable_id) === Number(subject.timetableId));
        } else {
            // Unsynced period (no timetableId yet) — fall back to subject_id + date match
            // Only match logs that don't have a timetable_id and haven't been claimed already
            log = attendanceLogsCache.find(l => formatDate(l.date) === selectedDateStr && Number(l.subject_id) === Number(subject.id) && !l.timetable_id && !claimedLogIds.has(l.id));
        }
        if (log) claimedLogIds.add(log.id);
        let status = log ? log.status : 'pending';
        if (isFetchingLogs && !log) status = 'loading';

        const slot = document.createElement('div');
        slot.className = `attendance-slot slot-${status}`;
        slot.innerHTML = `
            <div class="slot-content">
                <span class="slot-subject-name">${subject.name}</span>
                <div class="slot-status-badge status-${status}">${status}</div>
            </div>
            <div class="slot-actions-overlay">
                <button class="overlay-btn btn-present-mini" data-status="present">Present</button>
                <button class="overlay-btn btn-absent-mini" data-status="absent">Absent</button>
                <button class="overlay-btn btn-cancelled-mini" data-status="cancelled">Cancelled</button>
                <button class="overlay-btn btn-clear-mini" data-status="clear">Clear</button>
            </div>
        `;
        slot.querySelectorAll('.overlay-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                markAttendance(subject.name, btn.dataset.status, e, subject.timetableId || null, subject.id, log ? log.id : null);
            };
        });
        slot.onclick = () => {
            const isShowing = slot.classList.contains('show-actions');
            document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
            if (!isShowing) slot.classList.add('show-actions');
        };
        slotsWrapper.appendChild(slot);
    });
    renderExtraClasses(selectedDateStr, slotsWrapper, claimedLogIds);
}

function renderExtraClasses(selectedDateStr, slotsWrapper, claimedLogIds = new Set()) {
    const extraLogs = attendanceLogsCache.filter(l => formatDate(l.date) === selectedDateStr && !l.timetable_id && !claimedLogIds.has(l.id));
    if (extraLogs.length > 0) {
        extraLogs.forEach(log => {
            const slot = document.createElement('div');
            slot.className = 'attendance-slot extra-slot';
            slot.innerHTML = `
                <div class="slot-content">
                    <div style="display:flex; flex-direction:column;">
                        <span class="slot-subject-name">${log.subject_name}</span>
                        <small style="color: #64748b; font-size: 0.7rem;">Extra Class</small>
                    </div>
                    <div class="slot-status-badge status-${log.status}">${log.status}</div>
                </div>
                <div class="slot-actions-overlay">
                    <button class="overlay-btn btn-present-mini" data-status="present">Present</button>
                    <button class="overlay-btn btn-absent-mini" data-status="absent">Absent</button>
                    <button class="overlay-btn btn-clear-mini" data-status="clear">Remove</button>
                </div>
            `;
            slot.querySelectorAll('.overlay-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    markAttendance(log.subject_name, btn.dataset.status, e, null, log.subject_id, log.id);
                };
            });
            slot.onclick = () => {
                const isShowing = slot.classList.contains('show-actions');
                document.querySelectorAll('.attendance-slot').forEach(s => s.classList.remove('show-actions'));
                if (!isShowing) slot.classList.add('show-actions');
            };
            slotsWrapper.appendChild(slot);
        });
    }
}

export async function markAttendance(subjectName, status, event, timetableId, subjectId, logId = null, isNewExtraClass = false) {
    if (event) event.stopPropagation();
    const userId = getUserId();
    const dateStr = formatDate(selectedDate);
    
    // 1. Find old status for calculations
    const existingIndex = isNewExtraClass ? -1 : attendanceLogsCache.findIndex(l => 
        (logId && l.id === logId) || (formatDate(l.date) === dateStr && (timetableId ? Number(l.timetable_id) === Number(timetableId) : false))
    );
    const oldStatus = existingIndex > -1 ? attendanceLogsCache[existingIndex].status : 'pending';

    // 2. Instant local update for calendar
    if (status === 'clear') {
        if (existingIndex > -1) attendanceLogsCache.splice(existingIndex, 1);
    } else if (existingIndex > -1) {
        attendanceLogsCache[existingIndex].status = status;
        logId = attendanceLogsCache[existingIndex].id;
    } else {
        logId = logId || `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        attendanceLogsCache.push({ id: logId, date: dateStr, subject_id: subjectId, timetable_id: timetableId, status, subject_name: subjectName });
    }
    
    renderCalendar();
    renderDayAttendance();

    // 3. Instant local update for dashboard stats
    if (oldStatus !== status) {
        const dashboardCache = Storage.get(userId, 'dashboard');
        if (dashboardCache) {
            const updatedDashboard = calculateNewStats(dashboardCache, subjectId, oldStatus, status);
            Storage.save(userId, 'dashboard', updatedDashboard);
            if (window.refreshDashboard) window.refreshDashboard(updatedDashboard, ['subjects', 'timetable']);
        }
    }

    // 4. Queue for bulk sync
    const logData = { id: logId, date: dateStr, subjectId, timetableId, status, subjectName };
    const queueIdx = pendingLogsQueue.findIndex(l => 
        (logId && l.id === logId) || (l.date === dateStr && (timetableId ? l.timetableId === timetableId : false))
    );
    if (queueIdx > -1) pendingLogsQueue[queueIdx] = logData;
    else pendingLogsQueue.push(logData);

    debounceSync('attendance_queue', async () => {
        const logsToSync = [...pendingLogsQueue];
        pendingLogsQueue = [];
        isSyncingAttendance = true;
        try {
            await saveAttendanceLogApi(userId, logsToSync);
            // Save succeeded — data is now in DB. Fetch will return it with real IDs.
            // Only pendingLogsQueue (new edits made during save) needs merge protection.
            await _fetchMonthlyLogsInternal(userId);
            if (window.refreshDashboard) window.refreshDashboard();
        } finally {
            isSyncingAttendance = false;
        }
    }, 4000); 
}

export async function markWholeDay(status) {
    const userId = getUserId();
    const dateStr = formatDate(selectedDate);
    const daySubjects = getPeriodsData()[selectedDate.toLocaleDateString('en-US', { weekday: 'long' })] || [];
    const newLogs = daySubjects.filter(s => s.name).map(s => ({ date: dateStr, subjectId: s.id, timetableId: s.timetableId, status: status === 'holiday' ? 'cancelled' : status, subjectName: s.name }));
    
    if (newLogs.length === 0) return;

    let dashboardCache = Storage.get(userId, 'dashboard');

    newLogs.forEach(newLog => {
        // Local calendar update
        const idx = attendanceLogsCache.findIndex(l => formatDate(l.date) === dateStr && Number(l.timetable_id) === Number(newLog.timetableId));
        const oldStatus = idx > -1 ? attendanceLogsCache[idx].status : 'pending';
        
        if (status === 'clear') {
            if (idx > -1) attendanceLogsCache.splice(idx, 1);
        } else if (idx > -1) {
            attendanceLogsCache[idx].status = newLog.status;
        } else {
            attendanceLogsCache.push({ ...newLog, timetable_id: newLog.timetableId, subject_id: newLog.subjectId });
        }
        
        // Local dashboard update
        if (dashboardCache && oldStatus !== newLog.status) {
            dashboardCache = calculateNewStats(dashboardCache, newLog.subjectId, oldStatus, newLog.status);
        }

        // Add to sync queue
        const qIdx = pendingLogsQueue.findIndex(l => l.date === dateStr && l.timetableId === newLog.timetableId);
        if (qIdx > -1) pendingLogsQueue[qIdx] = newLog;
        else pendingLogsQueue.push(newLog);
    });

    if (dashboardCache) {
        Storage.save(userId, 'dashboard', dashboardCache);
        if (window.refreshDashboard) window.refreshDashboard(dashboardCache, ['subjects', 'timetable']);
    }

    renderCalendar();
    renderDayAttendance();

    debounceSync('attendance_queue', async () => {
        const logsToSync = [...pendingLogsQueue];
        pendingLogsQueue = [];
        isSyncingAttendance = true;
        try {
            await saveAttendanceLogApi(userId, logsToSync);
            await _fetchMonthlyLogsInternal(userId);
            if (window.refreshDashboard) window.refreshDashboard();
        } finally {
            isSyncingAttendance = false;
        }
    }, 4000);
}

export function openExtraClassModal() {
    const modal = document.getElementById('extraClassModal');
    const select = document.getElementById('extra-subject-select');
    if (!modal || !select) return;
    select.innerHTML = '<option value="">Select a subject</option>';
    (window.cachedSubjects || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    });
    modal.style.display = 'flex';
    // Small timeout to allow display:flex to apply before adding opacity transition
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

export function closeExtraClassModal() {
    const modal = document.getElementById('extraClassModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for transition
    }
}

export async function saveExtraClass() {
    const select = document.getElementById('extra-subject-select');
    const statusSelect = document.getElementById('extra-status-select');
    if (!select || !statusSelect) return;
    const subjectId = select.value;
    const subjectName = select.options[select.selectedIndex].text;
    const status = statusSelect.value;
    if (!subjectId) return;
    await markAttendance(subjectName, status, null, null, subjectId, null, true);
    closeExtraClassModal();
}

export function updateAttendanceCacheNames(subjects) {
    attendanceLogsCache.forEach(log => {
        const match = subjects.find(s => s.subject_id == log.subject_id);
        if (match) {
            log.subject_name = match.subject_name;
        }
    });
}
