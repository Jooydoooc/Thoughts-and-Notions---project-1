// Main Application State
let currentUser = null;
let currentBook = null;
let currentUnit = null;
let speech = null;
let skimmingInterval = null;
let isSkimmingActive = false;
let isReadingAloud = false;
let foundWords = new Set();
let exerciseAnswers = {};
let skimmingSpeed = 500;
let readingStartTime = null;
let vocabularyList = [];
let unitData = {};
let bookData = {};
let skimmingTimer = null;
let skimmingTimeLeft = 60; // 1 minute for skimming

// Application Data Storage
const appState = {
    books: {},
    units: {},
    vocabulary: {},
    grammar: {},
    exercises: {},
    progress: JSON.parse(localStorage.getItem('readingProgress')) || {}
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    updateLoginTime();
    loadAllData();
    
    // Check for existing user session
    const savedUser = localStorage.getItem('readingPlatformUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showPlatform();
    }
    
    // Update login time every second
    setInterval(updateLoginTime, 1000);
    
    // Initialize form handlers
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('group').addEventListener('change', handleGroupChange);
});

// Update login time display
function updateLoginTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('loginTime').value = now.toLocaleDateString('en-US', options);
}

// Handle group selection change
function handleGroupChange() {
    const groupSelect = document.getElementById('group');
    const otherContainer = document.getElementById('otherGroupContainer');
    otherContainer.style.display = groupSelect.value === 'Others' ? 'block' : 'none';
}

// Load all JSON data
async function loadAllData() {
    try {
        const [books, units, vocabulary, grammar, exercises] = await Promise.all([
            fetch('data/books.json').then(r => r.json()),
            fetch('data/units.json').then(r => r.json()),
            fetch('data/vocabulary.json').then(r => r.json()),
            fetch('data/grammar.json').then(r => r.json()),
            fetch('data/exercises.json').then(r => r.json())
        ]);
        
        appState.books = books;
        appState.units = units;
        appState.vocabulary = vocabulary;
        appState.grammar = grammar;
        appState.exercises = exercises;
        
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to default data
        loadDefaultData();
    }
}

// Load default data if JSON files fail
function loadDefaultData() {
    appState.books = {
        "thoughts_and_notions": {
            id: "thoughts_and_notions",
            title: "Thoughts and Notions",
            description: "Improve your reading skills with interesting texts, vocabulary, grammar, and exercises.",
            units: ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3"],
            difficulty: "B1",
            available: true
        },
        "reading_explorer": {
            id: "reading_explorer",
            title: "Reading Explorer",
            description: "Advanced reading comprehension and critical thinking skills.",
            units: ["1.1", "1.2", "2.1", "2.2"],
            difficulty: "B2",
            available: false
        }
    };
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const groupSelect = document.getElementById('group');
    let groupValue = groupSelect.value;
    
    if (groupValue === 'Others') {
        const otherGroup = document.getElementById('otherGroup').value;
        if (!otherGroup.trim()) {
            alert('Please specify your group');
            return;
        }
        groupValue = otherGroup;
    }
    
    currentUser = {
        name: document.getElementById('name').value.trim(),
        surname: document.getElementById('surname').value.trim(),
        group: groupValue,
        loginTime: document.getElementById('loginTime').value,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    if (!currentUser.name || !currentUser.surname || !currentUser.group) {
        alert('Please fill all required fields');
        return;
    }
    
    // Save user to localStorage
    localStorage.setItem('readingPlatformUser', JSON.stringify(currentUser));
    
    // Initialize progress for user if not exists
    if (!appState.progress[currentUser.id]) {
        appState.progress[currentUser.id] = {
            name: currentUser.name,
            surname: currentUser.surname,
            group: currentUser.group,
            books: {},
            totalReadingTime: 0,
            totalExercises: 0,
            averageScore: 0
        };
        saveProgress();
    }
    
    showPlatform();
}

// Show main platform
function showPlatform() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('platformContainer').style.display = 'block';
    
    // Update user info
    document.getElementById('userName').textContent = 
        `${currentUser.name} ${currentUser.surname}`;
    document.getElementById('userGroup').textContent = currentUser.group;
    document.getElementById('userAvatar').textContent = 
        currentUser.name.charAt(0).toUpperCase();
    
    // Load books
    loadBooks();
}

// Load books to display
function loadBooks() {
    const booksGrid = document.getElementById('booksGrid');
    const books = Object.values(appState.books);
    
    booksGrid.innerHTML = books.map(book => {
        const userProgress = appState.progress[currentUser.id]?.books?.[book.id] || {};
        const completedUnits = userProgress.units ? Object.keys(userProgress.units).length : 0;
        const totalUnits = book.units.length;
        const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
        
        return `
            <div class="book-card ${!book.available ? 'coming-soon' : ''}" 
                 onclick="${book.available ? `openBook('${book.id}')` : 'showComingSoon()'}">
                <div class="book-cover" style="background: linear-gradient(135deg, ${book.available ? '#667eea, #764ba2' : '#c3cfe2, #a5b4fc'});">
                    <i class="fas fa-${book.icon || 'book'}"></i>
                </div>
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>${book.description}</p>
                    ${book.available ? `
                        <div class="book-stats">
                            <div class="stat-item">
                                <div class="stat-number">${completedUnits}/${totalUnits}</div>
                                <div class="stat-label">Units</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${progressPercent}%</div>
                                <div class="stat-label">Progress</div>
                            </div>
                        </div>
                    ` : ''}
                    <span class="status-badge ${book.available ? 'available' : 'soon'}">
                        ${book.available ? 'Available Now' : 'Coming Soon'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// Show coming soon message
function showComingSoon() {
    alert('This book will be available soon!');
}

// Open a book
async function openBook(bookId) {
    currentBook = bookId;
    bookData = appState.books[bookId];
    
    // Hide books section, show unit view
    document.getElementById('booksSection').style.display = 'none';
    document.getElementById('unitView').style.display = 'block';
    
    // Load first unit
    await loadUnit(bookData.units[0]);
}

// Load a unit
async function loadUnit(unitId) {
    currentUnit = unitId;
    readingStartTime = Date.now();
    
    try {
        // Load unit data
        const unitKey = `${currentBook}_${unitId}`;
        unitData = appState.units[unitKey] || await loadUnitData(unitKey);
        
        // Update UI
        document.getElementById('unitTitle').textContent = `Unit ${unitId} - ${unitData.title}`;
        document.getElementById('vocabDifficulty').textContent = unitData.difficulty || 'B1';
        
        // Load unit text
        loadUnitText();
        
        // Load vocabulary
        await loadVocabulary(unitKey);
        
        // Load grammar
        await loadGrammar(unitKey);
        
        // Load exercises
        await loadExercises(unitKey);
        
        // Update unit selector
        updateUnitSelector();
        
        // Update progress display
        updateProgressDisplay();
        
        // Reset exercise answers
        exerciseAnswers = {};
        foundWords = new Set();
        
    } catch (error) {
        console.error('Error loading unit:', error);
        alert('Error loading unit. Please try again.');
    }
}

// Load unit data
async function loadUnitData(unitKey) {
    // In a real app, this would fetch from a server
    // For now, return mock data
    return {
        title: "The Zipper",
        text: `The zipper is a wonderful invention. How did people ever live without zippers? They are very common, so we forget that they are wonderful. They are very strong, but they open and close very easily. They come in many colors and sizes.

In the 1890s, people in the United States wore high shoes with a long row of buttons. Clothes often had long rows of buttons, too. People wished that clothes were easier to put on and take off.

Whitcomb L. Judson, an engineer from the United States, invented the zipper in 1893. However, his zippers didn't stay closed very well. This was embarrassing, and people didn't buy many of them.

Then Dr. Gideon Sundback from Sweden solved this problem. His zipper stayed closed.

A zipper has three parts: 1. There are dozens of metal or plastic hooks (called teeth) in two rows. 2. These hooks are fastened to two strips of cloth. The cloth strips are flexible. They bend easily. 3. A fastener slides along and joins the hooks together. When it slides the other way, it takes the hooks apart.

Dr. Sundback put the hooks on strips of cloth. The cloth holds all the hooks in place. They don't come apart very easily. This solved the problem of the first zippers.`,
        difficulty: "B1"
    };
}

// Load unit text
function loadUnitText() {
    const readingText = document.getElementById('readingText');
    readingText.innerHTML = unitData.text.split('\n\n').map((paragraph, index) => 
        `<div class="text-line" id="textLine${index}">${paragraph}</div>`
    ).join('');
}

// Load vocabulary for unit
async function loadVocabulary(unitKey) {
    const vocabularyList = appState.vocabulary[unitKey] || [
        {
            word: "invention",
            translation: "ixtiro",
            definition: "Something that has been invented or created for the first time",
            example: "The telephone was a revolutionary invention that changed communication.",
            level: "B1"
        }
    ];
    
    const vocabularyGrid = document.getElementById('vocabularyGrid');
    vocabularyGrid.innerHTML = vocabularyList.map((word, index) => `
        <div class="vocab-card" onclick="showWordDetails(${index})" id="vocabCard${index}">
            <div class="vocab-word">
                ${word.word}
                <span class="vocab-level level-${word.level.toLowerCase()}">${word.level}</span>
            </div>
            <div class="vocab-hint">
                <i class="fas fa-lightbulb"></i> Click to reveal translation
            </div>
            <div class="vocab-translation">
                <i class="fas fa-exchange-alt"></i> <strong>Translation:</strong> ${word.translation}
            </div>
            <div class="vocab-definition">
                <i class="fas fa-book"></i> <strong>Definition:</strong> ${word.definition}
            </div>
            <div class="vocab-example">
                <i class="fas fa-comment"></i> <strong>Example:</strong> ${word.example}
            </div>
        </div>
    `).join('');
    
    document.getElementById('totalCount').textContent = vocabularyList.length;
    updateStats();
}

// Show word details
function showWordDetails(index) {
    const card = document.getElementById(`vocabCard${index}`);
    const translation = card.querySelector('.vocab-translation');
    const definition = card.querySelector('.vocab-definition');
    const example = card.querySelector('.vocab-example');
    
    // Toggle display
    if (translation.style.display === 'none' || translation.style.display === '') {
        translation.style.display = 'block';
        definition.style.display = 'block';
        example.style.display = 'block';
        card.classList.add('found');
        foundWords.add(index);
        
        // Save to progress
        saveWordFound(index);
    } else {
        translation.style.display = 'none';
        definition.style.display = 'none';
        example.style.display = 'none';
        card.classList.remove('found');
        foundWords.delete(index);
    }
    
    updateStats();
}

// Save found word to progress
function saveWordFound(wordIndex) {
    if (!appState.progress[currentUser.id]) return;
    
    const unitKey = `${currentBook}_${currentUnit}`;
    if (!appState.progress[currentUser.id].books[currentBook]) {
        appState.progress[currentUser.id].books[currentBook] = { units: {} };
    }
    
    if (!appState.progress[currentUser.id].books[currentBook].units[currentUnit]) {
        appState.progress[currentUser.id].books[currentBook].units[currentUnit] = {
            vocabularyFound: [],
            exercises: {},
            readingTime: 0,
            completed: false
        };
    }
    
    const unitProgress = appState.progress[currentUser.id].books[currentBook].units[currentUnit];
    if (!unitProgress.vocabularyFound.includes(wordIndex)) {
        unitProgress.vocabularyFound.push(wordIndex);
        saveProgress();
    }
}

// Update statistics display
function updateStats() {
    const found = foundWords.size;
    const total = parseInt(document.getElementById('totalCount').textContent) || 1;
    const percentage = Math.round((found / total) * 100);
    
    document.getElementById('foundCount').textContent = found;
    document.getElementById('percentage').textContent = `${percentage}%`;
}

// Load grammar for unit
async function loadGrammar(unitKey) {
    const grammarData = appState.grammar[unitKey] || {
        title: "Past Simple Tense",
        explanation: "The Past Simple tense is used to talk about completed actions in the past.",
        examples: [
            "Whitcomb L. Judson invented the zipper in 1893.",
            "People wore high shoes with buttons."
        ]
    };
    
    const grammarContent = document.getElementById('grammarContent');
    grammarContent.innerHTML = `
        <div class="grammar-theme">
            <h3><i class="fas fa-magic"></i> ${grammarData.title}</h3>
            <div class="grammar-explanation">
                ${grammarData.explanation}
            </div>
            <div class="grammar-examples">
                ${grammarData.examples.map(example => `
                    <div class="grammar-example">
                        <div class="example-icon">
                            <i class="fas fa-star"></i>
                        </div>
                        <div>${example}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Load exercises for unit
async function loadExercises(unitKey) {
    const exercisesData = appState.exercises[unitKey] || {
        reading_comprehension: [
            {
                question: "When was the zipper invented?",
                options: ["1880", "1893", "1901", "1910"],
                correct: 1,
                type: "multiple_choice"
            }
        ],
        vocabulary: [
            {
                question: "What does 'invention' mean?",
                options: ["Something old", "Something created for the first time", "Something broken", "Something expensive"],
                correct: 1,
                type: "multiple_choice"
            }
        ],
        grammar: [
            {
                question: "Which sentence uses Past Simple correctly?",
                options: ["He invent the zipper.", "He invented the zipper.", "He is inventing the zipper.", "He will invent the zipper."],
                correct: 1,
                type: "multiple_choice"
            }
        ]
    };
    
    const exercisesContainer = document.getElementById('exercisesContainer');
    
    const exerciseCategories = [
        {
            title: "Reading Comprehension",
            icon: "fas fa-search",
            exercises: exercisesData.reading_comprehension,
            type: "reading"
        },
        {
            title: "Vocabulary",
            icon: "fas fa-book",
            exercises: exercisesData.vocabulary,
            type: "vocabulary"
        },
        {
            title: "Grammar",
            icon: "fas fa-language",
            exercises: exercisesData.grammar,
            type: "grammar"
        }
    ];
    
    exercisesContainer.innerHTML = exerciseCategories.map((category, catIndex) => `
        <div class="exercise-category">
            <div class="category-header">
                <div class="category-icon">
                    <i class="${category.icon}"></i>
                </div>
                <div>
                    <h3 style="color: var(--secondary); margin-bottom: 5px;">${category.title}</h3>
                    <p style="color: var(--gray);">${category.exercises.length} questions</p>
                </div>
            </div>
            <div class="exercise-list">
                ${category.exercises.map((exercise, exIndex) => {
                    const fullIndex = `${catIndex}_${exIndex}`;
                    return `
                        <div class="exercise-item">
                            <div class="question-text">
                                <strong>${exIndex + 1}.</strong> ${exercise.question}
                            </div>
                            <div class="options-grid">
                                ${exercise.options.map((option, optIndex) => `
                                    <div class="option" onclick="selectExerciseAnswer('${fullIndex}', ${optIndex})" 
                                         id="ex${fullIndex}opt${optIndex}">
                                        <div class="option-letter">${String.fromCharCode(65 + optIndex)}</div>
                                        <div>${option}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
}

// Select exercise answer
function selectExerciseAnswer(exerciseKey, optionIndex) {
    // Remove selection from all options in this exercise
    const [catIndex, exIndex] = exerciseKey.split('_');
    const exercisesData = appState.exercises[`${currentBook}_${currentUnit}`];
    
    let exerciseCount = 0;
    if (catIndex === '0') exerciseCount = exercisesData.reading_comprehension.length;
    else if (catIndex === '1') exerciseCount = exercisesData.vocabulary.length;
    else exerciseCount = exercisesData.grammar.length;
    
    for (let i = 0; i < exerciseCount; i++) {
        const testKey = `${catIndex}_${i}`;
        for (let j = 0; j < 4; j++) {
            const option = document.getElementById(`ex${testKey}opt${j}`);
            if (option && testKey === exerciseKey) {
                option.classList.remove('selected');
            }
        }
    }
    
    // Add selection to chosen option
    const selectedOption = document.getElementById(`ex${exerciseKey}opt${optionIndex}`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Store answer
    exerciseAnswers[exerciseKey] = optionIndex;
}

// Update unit selector
function updateUnitSelector() {
    const unitSelect = document.getElementById('unitSelect');
    const units = bookData.units || [];
    
    unitSelect.innerHTML = units.map(unit => `
        <option value="${unit}" ${unit === currentUnit ? 'selected' : ''}>
            Unit ${unit} - ${appState.units[`${currentBook}_${unit}`]?.title || ''}
        </option>
    `).join('');
}

// Update progress display
function updateProgressDisplay() {
    const unitProgress = appState.progress[currentUser.id]?.books?.[currentBook]?.units?.[currentUnit] || {};
    const vocabularyFound = unitProgress.vocabularyFound?.length || 0;
    const vocabularyTotal = appState.vocabulary[`${currentBook}_${currentUnit}`]?.length || 1;
    const progressPercent = Math.round((vocabularyFound / vocabularyTotal) * 100);
    
    document.getElementById('progressText').textContent = `${progressPercent}%`;
    
    // Update circular progress
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 15;
    const offset = circumference - (progressPercent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Save progress to localStorage
function saveProgress() {
    localStorage.setItem('readingProgress', JSON.stringify(appState.progress));
}

// Start skimming timer
function startSkimmingTimer() {
    if (skimmingTimer) {
        clearInterval(skimmingTimer);
        document.querySelector('.timer-btn').textContent = 'Start';
        skimmingTimeLeft = 60;
        updateTimerDisplay();
        return;
    }
    
    document.querySelector('.timer-btn').textContent = 'Stop';
    skimmingTimeLeft = 60;
    updateTimerDisplay();
    
    skimmingTimer = setInterval(() => {
        skimmingTimeLeft--;
        updateTimerDisplay();
        
        if (skimmingTimeLeft <= 0) {
            clearInterval(skimmingTimer);
            skimmingTimer = null;
            document.querySelector('.timer-btn').textContent = 'Start';
            alert('Time\'s up! Skimming practice complete.');
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(skimmingTimeLeft / 60);
    const seconds = skimmingTimeLeft % 60;
    document.getElementById('timerDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Toggle read aloud
function toggleReadAloud() {
    const btn = document.getElementById('readAloudBtn');
    
    if (isReadingAloud && speech) {
        speechSynthesis.cancel();
        btn.classList.remove('active');
        isReadingAloud = false;
        return;
    }
    
    if ('speechSynthesis' in window) {
        speech = new SpeechSynthesisUtterance(unitData.text);
        const speedValue = parseInt(document.getElementById('speedControl').value);
        speech.rate = speedValue / 2.5;
        speech.pitch = 1;
        speech.volume = 1;
        
        speech.onend = function() {
            btn.classList.remove('active');
            isReadingAloud = false;
        };
        
        speech.onerror = function() {
            btn.classList.remove('active');
            isReadingAloud = false;
        };
        
        speechSynthesis.speak(speech);
        btn.classList.add('active');
        isReadingAloud = true;
    } else {
        alert('Text-to-speech is not supported in your browser. Please try Chrome or Edge.');
    }
}

// Toggle skimming mode
function toggleSkimming() {
    const btn = document.getElementById('skimmingBtn');
    const progressBar = document.getElementById('skimmingProgress');
    
    if (isSkimmingActive) {
        clearInterval(skimmingInterval);
        skimmingInterval = null;
        btn.classList.remove('active');
        isSkimmingActive = false;
        resetText();
        progressBar.style.width = '0%';
        return;
    }
    
    btn.classList.add('active');
    isSkimmingActive = true;
    
    const textContainer = document.getElementById('readingText');
    const originalText = unitData.text;
    let currentPosition = 0;
    const totalLength = originalText.length;
    
    const speedValue = parseInt(document.getElementById('speedControl').value);
    const interval = 1000 / speedValue;
    
    skimmingInterval = setInterval(() => {
        if (currentPosition >= totalLength) {
            clearInterval(skimmingInterval);
            skimmingInterval = null;
            btn.classList.remove('active');
            isSkimmingActive = false;
            return;
        }
        
        const visibleText = originalText.substring(0, currentPosition);
        const hiddenText = originalText.substring(currentPosition);
        
        textContainer.innerHTML = visibleText + 
            '<span class="skimming-active">' + hiddenText + '</span>';
        
        const progress = (currentPosition / totalLength) * 100;
        progressBar.style.width = `${progress}%`;
        
        currentPosition += Math.max(1, Math.floor(totalLength / 500));
        
    }, interval);
}

// Reset text display
function resetText() {
    const readingText = document.getElementById('readingText');
    readingText.innerHTML = unitData.text.split('\n\n').map((paragraph, index) => 
        `<div class="text-line" id="textLine${index}">${paragraph}</div>`
    ).join('');
}

// Update reading speed
function updateSpeed() {
    const speed = parseInt(document.getElementById('speedControl').value);
    document.getElementById('speedValue').textContent = `${speed}x`;
    
    if (speech && isReadingAloud) {
        speech.rate = speed / 2.5;
    }
    
    if (isSkimmingActive) {
        toggleSkimming();
        setTimeout(() => toggleSkimming(), 100);
    }
}

// Submit exercises
async function submitExercises() {
    const exercisesData = appState.exercises[`${currentBook}_${currentUnit}`];
    let totalScore = 0;
    let totalQuestions = 0;
    const results = {};
    
    // Calculate scores for each category
    ['reading_comprehension', 'vocabulary', 'grammar'].forEach((category, catIndex) => {
        const categoryExercises = exercisesData[category] || [];
        categoryExercises.forEach((exercise, exIndex) => {
            totalQuestions++;
            const exerciseKey = `${catIndex}_${exIndex}`;
            const userAnswer = exerciseAnswers[exerciseKey];
            
            if (userAnswer === exercise.correct) {
                totalScore++;
                results[exerciseKey] = { correct: true, userAnswer, correctAnswer: exercise.correct };
            } else {
                results[exerciseKey] = { correct: false, userAnswer, correctAnswer: exercise.correct };
            }
        });
    });
    
    const percentage = Math.round((totalScore / totalQuestions) * 100);
    const readingTime = Math.floor((Date.now() - readingStartTime) / 60000); // in minutes
    
    // Update reading stats
    document.getElementById('readingTime').textContent = `${readingTime}m`;
    document.getElementById('wordsRead').textContent = unitData.text.split(/\s+/).length;
    
    // Save progress
    saveExerciseProgress(totalScore, totalQuestions, percentage, readingTime);
    
    // Show results
    showResults(totalScore, totalQuestions, percentage, results);
    
    // Send to Telegram
    await sendToTelegram(totalScore, totalQuestions, percentage, readingTime);
}

// Save exercise progress
function saveExerciseProgress(score, total, percentage, readingTime) {
    if (!appState.progress[currentUser.id]) return;
    
    const unitKey = `${currentBook}_${currentUnit}`;
    if (!appState.progress[currentUser.id].books[currentBook]) {
        appState.progress[currentUser.id].books[currentBook] = { units: {} };
    }
    
    if (!appState.progress[currentUser.id].books[currentBook].units[currentUnit]) {
        appState.progress[currentUser.id].books[currentBook].units[currentUnit] = {
            vocabularyFound: [],
            exercises: {},
            readingTime: 0,
            completed: false
        };
    }
    
    const unitProgress = appState.progress[currentUser.id].books[currentBook].units[currentUnit];
    unitProgress.exercises = {
        score,
        total,
        percentage,
        timestamp: new Date().toISOString()
    };
    unitProgress.readingTime = readingTime;
    unitProgress.completed = true;
    
    // Update overall stats
    const userProgress = appState.progress[currentUser.id];
    userProgress.totalExercises += 1;
    userProgress.averageScore = ((userProgress.averageScore * (userProgress.totalExercises - 1) + percentage) / userProgress.totalExercises);
    userProgress.totalReadingTime += readingTime;
    
    saveProgress();
}

// Show results modal
function showResults(score, total, percentage, results) {
    document.getElementById('finalScore').textContent = `${score}/${total}`;
    
    let message = '';
    if (percentage === 100) {
        message = '🎉 Perfect! Excellent work! You got everything right!';
    } else if (percentage >= 80) {
        message = '👍 Great job! You have a good understanding of the material.';
    } else if (percentage >= 60) {
        message = '💪 Good effort! Review the material and try again.';
    } else {
        message = '📚 Keep practicing! Review the text and vocabulary.';
    }
    
    document.getElementById('resultMessage').innerHTML = `
        <div style="margin: 20px 0;">
            <div style="font-size: 24px; font-weight: 700; color: ${percentage >= 80 ? 'var(--success)' : percentage >= 60 ? 'var(--warning)' : 'var(--danger)'}">
                ${percentage}%
            </div>
        </div>
        <div style="font-size: 18px; margin: 20px 0;">
            ${message}
        </div>
    `;
    
    document.getElementById('resultsModal').style.display = 'flex';
}

// Send results to Telegram
async function sendToTelegram(score, total, percentage, readingTime) {
    try {
        const response = await fetch('/api/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentName: `${currentUser.name} ${currentUser.surname}`,
                studentId: currentUser.id,
                group: currentUser.group,
                book: currentBook,
                unit: currentUnit,
                score: score,
                totalQuestions: total,
                percentage: percentage,
                readingTime: readingTime,
                vocabularyFound: foundWords.size,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.log('Failed to send to Telegram');
        }
    } catch (error) {
        console.log('Telegram notification error:', error);
    }
}

// Close results modal
function closeResults() {
    document.getElementById('resultsModal').style.display = 'none';
}

// Show books view
function showBooks() {
    document.getElementById('booksSection').style.display = 'block';
    document.getElementById('unitView').style.display = 'none';
    
    // Stop any active features
    if (speech && isReadingAloud) {
        speech.cancel();
        document.getElementById('readAloudBtn').classList.remove('active');
        isReadingAloud = false;
    }
    if (skimmingInterval) {
        clearInterval(skimmingInterval);
        document.getElementById('skimmingBtn').classList.remove('active');
        isSkimmingActive = false;
        resetText();
    }
    if (skimmingTimer) {
        clearInterval(skimmingTimer);
        skimmingTimer = null;
    }
}

// Show progress summary
function showProgressSummary() {
    const progressData = document.getElementById('progressData');
    const userProgress = appState.progress[currentUser.id];
    
    if (!userProgress) {
        progressData.innerHTML = '<p>No progress data available.</p>';
    } else {
        let html = `
            <div style="margin-bottom: 30px;">
                <h3 style="color: var(--secondary); margin-bottom: 15px;">Overall Statistics</h3>
                <div class="vocab-stats">
                    <div class="stat">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-number">${userProgress.totalReadingTime || 0}</div>
                        <div class="stat-label">Total Minutes</div>
                    </div>
                    <div class="stat">
                        <div class="stat-icon">
                            <i class="fas fa-tasks"></i>
                        </div>
                        <div class="stat-number">${userProgress.totalExercises || 0}</div>
                        <div class="stat-label">Exercises Done</div>
                    </div>
                    <div class="stat">
                        <div class="stat-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-number">${Math.round(userProgress.averageScore || 0)}%</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                </div>
            </div>
        `;
        
        // Show book progress
        Object.entries(userProgress.books || {}).forEach(([bookId, bookProgress]) => {
            const book = appState.books[bookId];
            if (!book) return;
            
            const completedUnits = Object.keys(bookProgress.units || {}).length;
            const totalUnits = book.units.length;
            const progressPercent = Math.round((completedUnits / totalUnits) * 100);
            
            html += `
                <div style="margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 15px;">
                    <h4 style="color: var(--secondary); margin-bottom: 15px;">${book.title}</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span>Progress: ${completedUnits}/${totalUnits} units</span>
                        <span style="font-weight: 700; color: var(--primary);">${progressPercent}%</span>
                    </div>
                    <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, var(--primary), var(--accent)); transition: width 0.5s ease;"></div>
                    </div>
                </div>
            `;
        });
        
        progressData.innerHTML = html;
    }
    
    document.getElementById('progressModal').style.display = 'flex';
}

// Close progress modal
function closeProgressModal() {
    document.getElementById('progressModal').style.display = 'none';
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('readingPlatformUser');
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('platformContainer').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('loginForm').reset();
    updateLoginTime();
    
    // Reset any active features
    if (speech && isReadingAloud) {
        speech.cancel();
    }
    if (skimmingInterval) {
        clearInterval(skimmingInterval);
    }
    if (skimmingTimer) {
        clearInterval(skimmingTimer);
    }
}

// Teacher Mode functions
function showTeacherMode() {
    document.getElementById('teacherModal').style.display = 'flex';
}

function closeTeacherModal() {
    document.getElementById('teacherModal').style.display = 'none';
}

async function enterTeacherMode() {
    const password = document.getElementById('teacherPassword').value;

    try {
        const res = await fetch('/api/teacher-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('teacherModal').style.display = 'none';
            document.getElementById('teacherDashboard').style.display = 'block';
            loadTeacherDashboard();
        } else {
            alert('Incorrect password');
        }
    } catch (err) {
        alert('Authentication error');
        console.error(err);
    }
}

function exitTeacherMode() {
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('teacherPassword').value = '';
}

function loadTeacherDashboard() {
    // Load groups filter
    const groups = new Set();
    Object.values(appState.progress).forEach(progress => {
        groups.add(progress.group);
    });
    
    const groupFilter = document.getElementById('groupFilter');
    groupFilter.innerHTML = '<option value="all">All Groups</option>' + 
        Array.from(groups).map(group => `<option value="${group}">${group}</option>`).join('');
    
    // Load submissions
    filterSubmissions();
}

function filterSubmissions() {
    const groupFilter = document.getElementById('groupFilter').value;
    const submissionsBody = document.getElementById('submissionsBody');
    
    let submissions = [];
    
    Object.entries(appState.progress).forEach(([studentId, studentProgress]) => {
        if (groupFilter !== 'all' && studentProgress.group !== groupFilter) return;
        
        Object.entries(studentProgress.books || {}).forEach(([bookId, bookProgress]) => {
            Object.entries(bookProgress.units || {}).forEach(([unitId, unitProgress]) => {
                if (unitProgress.exercises) {
                    submissions.push({
                        student: `${studentProgress.name} ${studentProgress.surname}`,
                        group: studentProgress.group,
                        book: appState.books[bookId]?.title || bookId,
                        unit: unitId,
                        score: `${unitProgress.exercises.score}/${unitProgress.exercises.total}`,
                        percentage: `${unitProgress.exercises.percentage}%`,
                        time: `${unitProgress.readingTime}m`,
                        date: new Date(unitProgress.exercises.timestamp).toLocaleDateString()
                    });
                }
            });
        });
    });
    
    submissionsBody.innerHTML = submissions.map(sub => `
        <tr>
            <td>${sub.student}</td>
            <td>${sub.group}</td>
            <td>${sub.book}</td>
            <td>${sub.unit}</td>
            <td style="font-weight: 700; color: ${parseInt(sub.percentage) >= 80 ? 'var(--success)' : parseInt(sub.percentage) >= 60 ? 'var(--warning)' : 'var(--danger)'}">
                ${sub.score} (${sub.percentage})
            </td>
            <td>${sub.time}</td>
            <td>${sub.date}</td>
        </tr>
    `).join('');
}

function exportData(format) {
    const groupFilter = document.getElementById('groupFilter').value;
    let data = [];
    
    Object.entries(appState.progress).forEach(([studentId, studentProgress]) => {
        if (groupFilter !== 'all' && studentProgress.group !== groupFilter) return;
        
        Object.entries(studentProgress.books || {}).forEach(([bookId, bookProgress]) => {
            Object.entries(bookProgress.units || {}).forEach(([unitId, unitProgress]) => {
                if (unitProgress.exercises) {
                    data.push({
                        student: `${studentProgress.name} ${studentProgress.surname}`,
                        group: studentProgress.group,
                        book: appState.books[bookId]?.title || bookId,
                        unit: unitId,
                        score: unitProgress.exercises.score,
                        total: unitProgress.exercises.total,
                        percentage: unitProgress.exercises.percentage,
                        readingTime: unitProgress.readingTime,
                        vocabularyFound: unitProgress.vocabularyFound?.length || 0,
                        date: unitProgress.exercises.timestamp
                    });
                }
            });
        });
    });
    
    if (format === 'json') {
        downloadJSON(data, 'ielts-progress.json');
    } else if (format === 'csv') {
        downloadCSV(data, 'ielts-progress.csv');
    }
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadCSV(data, filename) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
