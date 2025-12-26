/**
 * Grade Calculator Application
 * A clean, extensible grade calculation tool with mobile-first design
 */

// ===================================
// Constants
// ===================================

const STORAGE_KEY = 'gradeCalculatorData';

// ===================================
// State Management
// ===================================

const state = {
    categories: [],
    isWeighted: true,
    nextCategoryId: 1,
    nextGradeId: 1
};

// ===================================
// DOM References
// ===================================

const dom = {
    get weightedModeCheckbox() { return document.getElementById('weightedMode'); },
    get addCategoryBtn() { return document.getElementById('addCategory'); },
    get clearDataBtn() { return document.getElementById('clearData'); },
    get categoriesContainer() { return document.getElementById('categories'); },
    get finalGradeDisplay() { return document.getElementById('finalGrade'); },
    get letterGradeDisplay() { return document.getElementById('letterGrade'); },
    get categoryTemplate() { return document.getElementById('categoryTemplate'); },
    get gradeTemplate() { return document.getElementById('gradeTemplate'); }
};

// ===================================
// Local Storage Functions
// ===================================

/**
 * Save current state to localStorage
 */
function saveState() {
    try {
        const dataToSave = {
            categories: state.categories,
            isWeighted: state.isWeighted,
            nextCategoryId: state.nextCategoryId,
            nextGradeId: state.nextGradeId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
        console.warn('Failed to save state to localStorage:', e);
    }
}

/**
 * Load state from localStorage
 * @returns {boolean} - Whether state was loaded successfully
 */
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            state.categories = data.categories || [];
            state.isWeighted = data.isWeighted !== undefined ? data.isWeighted : true;
            state.nextCategoryId = data.nextCategoryId || 1;
            state.nextGradeId = data.nextGradeId || 1;
            return true;
        }
    } catch (e) {
        console.warn('Failed to load state from localStorage:', e);
    }
    return false;
}

/**
 * Clear all saved data
 */
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
        }
        
        // Reset state
        state.categories = [];
        state.nextCategoryId = 1;
        state.nextGradeId = 1;
        
        // Clear UI
        dom.categoriesContainer.innerHTML = '';
        
        // Create default category
        const defaultCategory = createCategory('Assignments', 100);
        renderCategory(defaultCategory);
        updateFinalGradeDisplay();
    }
}

/**
 * Debounce function to limit save frequency
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced save function
const debouncedSave = debounce(saveState, 300);

// ===================================
// Grade Calculation Functions
// ===================================

/**
 * Calculate the average of grades in a category
 * @param {Array} grades - Array of grade objects with score and max properties
 * @returns {number|null} - The percentage average or null if no valid grades
 */
function calculateCategoryAverage(grades) {
    const validGrades = grades.filter(g => 
        g.score !== null && 
        g.max !== null && 
        g.max > 0
    );

    if (validGrades.length === 0) return null;

    // Calculate as total points earned / total points possible
    const totalScore = validGrades.reduce((sum, g) => sum + g.score, 0);
    const totalMax = validGrades.reduce((sum, g) => sum + g.max, 0);

    return (totalScore / totalMax) * 100;
}

/**
 * Calculate the final grade based on all categories
 * @param {Array} categories - Array of category objects
 * @param {boolean} weighted - Whether to use weighted calculation
 * @returns {number|null} - The final percentage or null if no valid data
 */
function calculateFinalGrade(categories, weighted) {
    const categoriesWithAvg = categories
        .map(cat => ({
            ...cat,
            average: calculateCategoryAverage(cat.grades)
        }))
        .filter(cat => cat.average !== null);

    if (categoriesWithAvg.length === 0) return null;

    if (weighted) {
        // Weighted calculation
        const totalWeight = categoriesWithAvg.reduce((sum, cat) => sum + (cat.weight || 0), 0);
        
        if (totalWeight === 0) return null;

        const weightedSum = categoriesWithAvg.reduce((sum, cat) => {
            return sum + (cat.average * (cat.weight || 0));
        }, 0);

        return weightedSum / totalWeight;
    } else {
        // Unweighted: simple average of all category averages
        const sum = categoriesWithAvg.reduce((acc, cat) => acc + cat.average, 0);
        return sum / categoriesWithAvg.length;
    }
}

/**
 * Convert a percentage grade to a letter grade
 * @param {number} percentage - The grade percentage
 * @returns {string} - The letter grade
 */
function getLetterGrade(percentage) {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
}

// ===================================
// UI Update Functions
// ===================================

/**
 * Update the display for a specific category's average
 * @param {string} categoryId - The category ID
 */
function updateCategoryDisplay(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return;

    const categoryEl = document.querySelector(`[data-category-id="${categoryId}"]`);
    if (!categoryEl) return;

    const avgDisplay = categoryEl.querySelector('.category-average');
    const average = calculateCategoryAverage(category.grades);

    if (average !== null) {
        avgDisplay.textContent = average.toFixed(2) + '%';
    } else {
        avgDisplay.textContent = '--';
    }
}

/**
 * Update the final grade display
 */
function updateFinalGradeDisplay() {
    const finalGrade = calculateFinalGrade(state.categories, state.isWeighted);

    if (finalGrade !== null) {
        dom.finalGradeDisplay.textContent = finalGrade.toFixed(2) + '%';
        dom.letterGradeDisplay.textContent = getLetterGrade(finalGrade);
    } else {
        dom.finalGradeDisplay.textContent = '--';
        dom.letterGradeDisplay.textContent = '--';
    }
}

/**
 * Update all displays
 */
function updateAllDisplays() {
    state.categories.forEach(cat => updateCategoryDisplay(cat.id));
    updateFinalGradeDisplay();
}

// ===================================
// Category Management
// ===================================

/**
 * Create a new category
 * @param {string} name - Category name
 * @param {number} weight - Category weight percentage
 * @returns {object} - The new category object
 */
function createCategory(name = 'New Category', weight = 25) {
    const category = {
        id: 'cat-' + state.nextCategoryId++,
        name,
        weight,
        grades: []
    };
    state.categories.push(category);
    debouncedSave();
    return category;
}

/**
 * Remove a category by ID
 * @param {string} categoryId - The category ID to remove
 */
function removeCategory(categoryId) {
    state.categories = state.categories.filter(c => c.id !== categoryId);
    const categoryEl = document.querySelector(`[data-category-id="${categoryId}"]`);
    if (categoryEl) {
        categoryEl.remove();
    }
    updateFinalGradeDisplay();
    debouncedSave();
}

/**
 * Render a category to the DOM
 * @param {object} category - The category object
 */
function renderCategory(category) {
    const template = dom.categoryTemplate.content.cloneNode(true);
    const categoryEl = template.querySelector('.category');

    categoryEl.dataset.categoryId = category.id;
    categoryEl.querySelector('.category-name').value = category.name;
    categoryEl.querySelector('.category-weight').value = category.weight;

    // Event listeners
    const nameInput = categoryEl.querySelector('.category-name');
    nameInput.addEventListener('input', (e) => {
        category.name = e.target.value;
        debouncedSave();
    });
    
    // Dismiss keyboard on Enter
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    });

    const weightInput = categoryEl.querySelector('.category-weight');
    weightInput.addEventListener('input', (e) => {
        category.weight = parseFloat(e.target.value) || 0;
        updateFinalGradeDisplay();
        debouncedSave();
    });
    
    weightInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    });

    const removeBtn = categoryEl.querySelector('.btn-remove-category');
    removeBtn.addEventListener('click', () => {
        removeCategory(category.id);
    });

    const addGradeBtn = categoryEl.querySelector('.btn-add-grade');
    addGradeBtn.addEventListener('click', () => {
        const grade = createGrade(category.id);
        renderGrade(category.id, grade);
        updateCategoryDisplay(category.id);
        updateFinalGradeDisplay();
        
        // Focus the new grade name input on mobile
        const categoryEl = document.querySelector(`[data-category-id="${category.id}"]`);
        const gradeRows = categoryEl.querySelectorAll('.grade-row');
        const lastGradeRow = gradeRows[gradeRows.length - 1];
        if (lastGradeRow) {
            const nameInput = lastGradeRow.querySelector('.grade-name');
            // Small delay to ensure the element is in the DOM
            setTimeout(() => nameInput.focus(), 50);
        }
    });

    dom.categoriesContainer.appendChild(template);
    
    // Render existing grades if loading from storage
    category.grades.forEach(grade => {
        renderGrade(category.id, grade, false);
    });
}

// ===================================
// Grade Management
// ===================================

/**
 * Create a new grade in a category
 * @param {string} categoryId - The category ID
 * @param {string} name - Grade name
 * @param {number|null} score - Grade score
 * @param {number} max - Maximum possible score
 * @returns {object} - The new grade object
 */
function createGrade(categoryId, name = '', score = null, max = 100) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return null;

    const grade = {
        id: 'grade-' + state.nextGradeId++,
        name,
        score,
        max
    };
    category.grades.push(grade);
    debouncedSave();
    return grade;
}

/**
 * Remove a grade by ID
 * @param {string} categoryId - The category ID
 * @param {string} gradeId - The grade ID to remove
 */
function removeGrade(categoryId, gradeId) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return;

    category.grades = category.grades.filter(g => g.id !== gradeId);
    const gradeEl = document.querySelector(`[data-grade-id="${gradeId}"]`);
    if (gradeEl) {
        gradeEl.remove();
    }
    updateCategoryDisplay(categoryId);
    updateFinalGradeDisplay();
    debouncedSave();
}

/**
 * Render a grade to the DOM
 * @param {string} categoryId - The category ID
 * @param {object} grade - The grade object
 * @param {boolean} isNew - Whether this is a newly created grade
 */
function renderGrade(categoryId, grade, isNew = true) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return;

    const categoryEl = document.querySelector(`[data-category-id="${categoryId}"]`);
    if (!categoryEl) return;

    const gradesList = categoryEl.querySelector('.grades-list');
    const template = dom.gradeTemplate.content.cloneNode(true);
    const gradeEl = template.querySelector('.grade-row');

    gradeEl.dataset.gradeId = grade.id;
    gradeEl.querySelector('.grade-name').value = grade.name;
    if (grade.score !== null) {
        gradeEl.querySelector('.grade-score').value = grade.score;
    }
    gradeEl.querySelector('.grade-max').value = grade.max;

    // Event listeners
    const nameInput = gradeEl.querySelector('.grade-name');
    nameInput.addEventListener('input', (e) => {
        grade.name = e.target.value;
        debouncedSave();
    });
    
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Move to score input
            const scoreInput = e.target.closest('.grade-row').querySelector('.grade-score');
            scoreInput.focus();
        }
    });

    const scoreInput = gradeEl.querySelector('.grade-score');
    scoreInput.addEventListener('input', (e) => {
        grade.score = e.target.value !== '' ? parseFloat(e.target.value) : null;
        updateCategoryDisplay(categoryId);
        updateFinalGradeDisplay();
        debouncedSave();
    });
    
    scoreInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Move to max input
            const maxInput = e.target.closest('.grade-row').querySelector('.grade-max');
            maxInput.focus();
        }
    });

    const maxInput = gradeEl.querySelector('.grade-max');
    maxInput.addEventListener('input', (e) => {
        grade.max = e.target.value !== '' ? parseFloat(e.target.value) : null;
        updateCategoryDisplay(categoryId);
        updateFinalGradeDisplay();
        debouncedSave();
    });
    
    maxInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    });

    const removeBtn = gradeEl.querySelector('.btn-remove-grade');
    removeBtn.addEventListener('click', () => {
        removeGrade(categoryId, grade.id);
    });

    gradesList.appendChild(template);
}

// ===================================
// Mode Toggle
// ===================================

/**
 * Toggle between weighted and unweighted mode
 * @param {boolean} weighted - Whether to use weighted mode
 */
function setWeightedMode(weighted) {
    state.isWeighted = weighted;
    document.body.classList.toggle('unweighted-mode', !weighted);
    updateFinalGradeDisplay();
    debouncedSave();
}

// ===================================
// Initialization
// ===================================

/**
 * Initialize the application
 */
function init() {
    // Load saved state
    const hasStoredState = loadState();
    
    // Set up weighted mode toggle
    dom.weightedModeCheckbox.checked = state.isWeighted;
    document.body.classList.toggle('unweighted-mode', !state.isWeighted);
    
    // Set up event listeners
    dom.weightedModeCheckbox.addEventListener('change', (e) => {
        setWeightedMode(e.target.checked);
    });

    dom.addCategoryBtn.addEventListener('click', () => {
        const category = createCategory();
        renderCategory(category);
        updateFinalGradeDisplay();
        
        // Focus the new category name input
        const categoryEl = document.querySelector(`[data-category-id="${category.id}"]`);
        if (categoryEl) {
            const nameInput = categoryEl.querySelector('.category-name');
            setTimeout(() => {
                nameInput.focus();
                nameInput.select();
            }, 50);
        }
    });
    
    dom.clearDataBtn.addEventListener('click', clearAllData);

    // Render stored categories or create default
    if (hasStoredState && state.categories.length > 0) {
        state.categories.forEach(category => renderCategory(category));
        updateAllDisplays();
    } else {
        const defaultCategory = createCategory('Assignments', 100);
        renderCategory(defaultCategory);
    }
    
    // Handle visibility change to save state
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveState();
        }
    });
    
    // Save state before page unload
    window.addEventListener('beforeunload', saveState);
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
