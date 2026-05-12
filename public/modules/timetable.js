import { saveTimetableApi } from './api.js';
import { getUserId } from './utils.js';
import { Storage } from './storage.js';
import { debounceSync } from './sync.js';

let draggedSubjectItem = null;
let currentDay = 'Monday';
let availableSubjects = [];
let periodsData = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

export function initTimetable(timetable) {
    if (!timetable) return;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
        const backendDay = day.toLowerCase();
        if (timetable[backendDay] && timetable[backendDay].length > 0) {
            periodsData[day] = timetable[backendDay];
        } else {
            // Default: 6 empty periods
            periodsData[day] = Array(6).fill(null).map(() => ({ id: null, name: '' }));
        }
    });
    
    renderPeriods();
}

export function populateTimetableGrid(subjects) {
    availableSubjects = subjects || [];
    const container = document.getElementById('timetable-grid-container');
    if (!container) return;
    
    // On mobile, we might want to hide the palette if we're using the + system
    // But for now, let's keep it for desktop users.
    container.innerHTML = '';

    if (!availableSubjects || availableSubjects.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; color: #7f8c8d;">No subjects added yet.</p>';
        return;
    }

    availableSubjects.forEach(s => {
        const box = document.createElement('div');
        box.className = 'draggable-subject';
        box.draggable = true;
        box.textContent = s.subject_name;
        box.dataset.id = s.subject_id;
        
        box.addEventListener('dragstart', handleDragStart);
        box.addEventListener('dragend', handleDragEnd);
        box.addEventListener('dragover', handleDragOver);
        box.addEventListener('dragenter', handleDragEnter);
        box.addEventListener('dragleave', handleDragLeave);
        box.addEventListener('drop', handleDrop);

        container.appendChild(box);
    });
}

function handleDragStart(e) {
    draggedSubjectItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.textContent);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('over');
}

function handleDragLeave(e) {
    this.classList.remove('over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (draggedSubjectItem !== this) {
        let tempText = this.textContent;
        let tempId = this.dataset.id;
        
        this.textContent = draggedSubjectItem.textContent;
        this.dataset.id = draggedSubjectItem.dataset.id;
        
        draggedSubjectItem.textContent = tempText;
        draggedSubjectItem.dataset.id = tempId;
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.draggable-subject, .period-slot').forEach(item => {
        item.classList.remove('over');
    });
}

export function switchDay(day) {
    currentDay = day;
    const label = document.getElementById('current-day-label');
    if (label) label.textContent = day;
    
    document.querySelectorAll('.day-btn').forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        const dayShort = day.substring(0, 3).toLowerCase();
        if (btnText === dayShort) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    renderPeriods();
}

export function addPeriod() {
    periodsData[currentDay].push({ id: null, name: '' });
    renderPeriods();
    triggerAutoSave();
}

export function renderPeriods() {
    const container = document.getElementById('daily-timetable-container');
    if (!container) return;
    container.innerHTML = '';
    
    periodsData[currentDay].forEach((period, index) => {
        const slot = document.createElement('div');
        slot.className = 'period-slot';
        slot.dataset.index = index;
        
        const content = document.createElement('div');
        content.className = 'slot-content';
        
        if (period.name) {
            content.textContent = period.name;
            slot.dataset.id = period.id;
            slot.classList.add('filled');
        } else {
            content.textContent = `P${index + 1}`;
        }
        
        // Remove Period Button (The '×' button)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'slot-action-btn remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove Period';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            deletePeriod(index);
        };
        slot.appendChild(removeBtn);

        // Add Button (The '+' indicator/overlay) if empty
        if (!period.name) {
            const addBtn = document.createElement('button');
            addBtn.className = 'slot-action-btn add-btn';
            addBtn.innerHTML = '&plus;';
            addBtn.title = 'Assign Subject';
            slot.appendChild(addBtn);
        }
        
        slot.appendChild(content);
        
        // Click to toggle subject picker
        slot.onclick = () => showSubjectPicker(slot, index);
        
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragenter', handleDragEnter);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handlePeriodDrop);
        
        container.appendChild(slot);
    });

    renderTimetableOverview();
}

function deletePeriod(index) {
    periodsData[currentDay].splice(index, 1);
    renderPeriods();
    triggerAutoSave();
}

function showSubjectPicker(anchor, index) {
    // Remove any existing pickers
    const existing = document.querySelector('.subject-picker-overlay');
    if (existing) existing.remove();

    if (availableSubjects.length === 0) {
        alert('Please add subjects first in the Subjects section.');
        return;
    }

    const picker = document.createElement('div');
    picker.className = 'subject-picker-overlay';
    
    const list = document.createElement('div');
    list.className = 'subject-picker-list';
    
    const header = document.createElement('div');
    header.className = 'picker-header';
    header.textContent = 'Select Subject';
    list.appendChild(header);

    availableSubjects.forEach(s => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.textContent = s.subject_name;
        item.onclick = (e) => {
            e.stopPropagation();
            assignSubjectToPeriod(index, s.subject_id, s.subject_name);
            picker.remove();
        };
        list.appendChild(item);
    });

    // Close button for mobile
    const closeBtn = document.createElement('div');
    closeBtn.className = 'picker-item close-item';
    closeBtn.textContent = 'Cancel';
    closeBtn.onclick = () => picker.remove();
    list.appendChild(closeBtn);

    picker.appendChild(list);
    document.body.appendChild(picker);
    
    // Handle click outside
    picker.onclick = (e) => {
        if (e.target === picker) picker.remove();
    };
}

function assignSubjectToPeriod(index, subjectId, subjectName) {
    periodsData[currentDay][index] = {
        id: subjectId,
        name: subjectName
    };
    renderPeriods();
    triggerAutoSave();
}

function handlePeriodDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    this.classList.remove('over');
    
    if (draggedSubjectItem && this.dataset.index !== undefined) {
        const index = parseInt(this.dataset.index);
        periodsData[currentDay][index] = {
            id: parseInt(draggedSubjectItem.dataset.id),
            name: draggedSubjectItem.textContent
        };
        renderPeriods();
        triggerAutoSave();
    }
    draggedSubjectItem = null;
    return false;
}

function triggerAutoSave() {
    const userId = getUserId();
    
    // DELTA CHECK
    const lastSaved = Storage.get(userId, 'timetable_last_saved');
    if (JSON.stringify(periodsData) === JSON.stringify(lastSaved)) return;

    // OPTIMISTIC UPDATE
    const dashboardCache = Storage.get(userId, 'dashboard');
    if (dashboardCache) {
        dashboardCache.timetable = JSON.parse(JSON.stringify(periodsData));
        Storage.save(userId, 'dashboard', dashboardCache);
        if (window.refreshDashboard) window.refreshDashboard(dashboardCache, ['timetable']);
    }

    debounceSync('timetable', async () => {
        await saveTimetableApi(userId, periodsData);
        Storage.save(userId, 'timetable_last_saved', periodsData);
    }, 4000);
}

export function renderTimetableOverview() {
    const container = document.getElementById('timetable-overview-content');
    if (!container) return;
    container.innerHTML = '';
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
        const row = document.createElement('div');
        row.className = 'overview-day-row';
        const dayName = document.createElement('div');
        dayName.className = 'overview-day-name';
        dayName.textContent = day;
        const periodsDiv = document.createElement('div');
        periodsDiv.className = 'overview-periods';
        const dayPeriods = periodsData[day] || [];
        const subjectsInDay = dayPeriods.filter(p => p.name);
        if (subjectsInDay.length > 0) {
            subjectsInDay.forEach(p => {
                const item = document.createElement('span');
                item.className = 'overview-period-item';
                item.textContent = p.name;
                periodsDiv.appendChild(item);
            });
        } else {
            const empty = document.createElement('span');
            empty.className = 'overview-empty';
            empty.textContent = 'No subjects assigned';
            periodsDiv.appendChild(empty);
        }
        row.appendChild(dayName);
        row.appendChild(periodsDiv);
        container.appendChild(row);
    });
}

export function getPeriodsData() {
    return periodsData;
}
