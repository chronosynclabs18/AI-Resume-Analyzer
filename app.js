// ==========================================================================
// Frontend JavaScript Controller: AI Powered Hiring & Skill Gap Analysis
// Handles: PDF Parsing, Backend API Integration, Animations, Charts, and Preset Loading
// ==========================================================================

const API_BASE_URL = 'http://127.0.0.1:5000';

// Global variables to store analysis results and charts
let analysisData = null;
let charts = {};

// Configure PDF.js worker path
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

// Preset Data
const PRESETS = {
    "preset-ml-engineer": {
        role: "Machine Learning Engineer",
        resume: `ANKIT KUMAR - MACHINE LEARNING ENGINEER
Email: ankit.ml@email.com | Github: github.com/ankit-ml | Phone: 123-456-7890

SUMMARY:
Results-driven Machine Learning Engineer with 2+ years of experience design and deploying scalable deep learning systems and NLP pipelines. Proficient in PyTorch, Scikit-Learn, and MLOps tools (Docker, AWS, Git). Strong background in statistics and linear algebra.

EXPERIENCE:
Junior ML Engineer | TechCorp Inc. (2024 - Present)
- Designed and trained a convolutional neural network (CNN) image classification pipeline in PyTorch, improving model accuracy by 18% and reducing inference latency.
- Implemented natural language processing (NLP) models using Transformers and HuggingFace for sentiment classification on customer feedback, achieving a 92% F1-score.
- Conducted hyperparameter tuning, cross validation, and feature engineering to optimize supervised learning models, reducing training time.
- Deployed prediction models as microservices in Docker containers onto AWS EC2 instances, setting up automated CI/CD workflows using Git.

PROJECTS:
LLM Semantic Search Engine
- Built a semantic search engine using BERT embeddings, cosine similarity, and vector databases, reducing retrieval query time.
- Implemented data collection pipelines using Python, SQL, and Pandas.

EDUCATION:
B.Tech in Computer Science | Global University
Key coursework: Linear Algebra, Probability & Statistics, Advanced Algorithms, Machine Learning.

TECHNICAL SKILLS:
- Languages: Python, SQL, C++
- ML & Frameworks: PyTorch, Scikit-Learn, TensorFlow, Pandas, NumPy
- Advanced: Transformers, NLP, Deep Learning, Computer Vision, CNN, Regression
- MLOps & Tools: Git, Docker, AWS, FastAPI, Linux, CI/CD`,
        jd: `We are looking for a Machine Learning Engineer to join our AI team.

Key Requirements:
- Strong programming skills in Python and SQL.
- Experience building and evaluating ML models using Scikit-Learn.
- Knowledge of Deep Learning frameworks (PyTorch or TensorFlow) and architectures like CNNs and Transformers.
- Familiarity with NLP techniques (embeddings, tokenization) and computer vision pipelines (OpenCV).
- Understanding of probability, statistics, linear algebra, and evaluation metrics (accuracy, F1-score).
- Hands-on experience with MLOps tools: Git, Docker, and cloud platforms like AWS or GCP for API deployment.`
    },
    "preset-data-analyst": {
        role: "Data Scientist",
        resume: `PRIYA SHARMA - DATA ANALYST & STATISTICIAN
Email: priya.data@email.com | Phone: 987-654-3210

SUMMARY:
Data Analyst with 3 years of experience in data preprocessing, statistical hypothesis testing, and business intelligence. Skilled in SQL, R programming, and Python data structures (Pandas, NumPy). Experienced in linear regression and data visualizations.

EXPERIENCE:
Data Analyst | Retail Solutions Corp (2023 - Present)
- Preprocessed large datasets using Pandas, NumPy, and SQL databases, handling imputation and outlier scaling.
- Conducted statistical analysis, ANOVA testing, and p-value evaluation to measure the impact of new marketing strategies.
- Implemented simple supervised learning models (linear regression, logistic regression, decision tree) in Scikit-Learn to forecast sales.
- Designed interactive dashboard reports using Matplotlib and Tableau for stakeholder presentations.

PROJECTS:
E-Commerce Demand Forecasting
- Developed a regression analysis model to predict weekly sales patterns, using R and NumPy.
- Optimized database query structures, improving data fetching speeds.

EDUCATION:
M.S. in Statistics | National Institute of Science

TECHNICAL SKILLS:
- Languages: SQL, R, Python, Java
- Analytics: Statistics, Probability, Hypothesis Testing, Regression, Data Preprocessing
- ML: Scikit-Learn, Decision Tree, Linear Regression
- Libraries: Pandas, NumPy, Matplotlib, Seaborn`,
        jd: `We are seeking a Data Scientist with a strong statistics background.

Key Requirements:
- Expert in Python, SQL, and statistical programming.
- Solid understanding of linear algebra, hypothesis testing, probability, and regression models.
- Practical experience with Scikit-Learn for supervised learning, including Decision Trees and Random Forests.
- Background in data preprocessing, feature engineering, and cross validation.
- Knowledge of Deep Learning (PyTorch) and cloud ML deployment (AWS, GCP) is a strong plus.`
    },
    "preset-web-dev": {
        role: "Machine Learning Engineer",
        resume: `JOHN DOE - FULL STACK WEB DEVELOPER
Email: john.dev@email.com | Website: johndoe.dev

SUMMARY:
Frontend-focused Full Stack Developer with 4 years of experience building modern, responsive web applications. Expert in HTML, CSS, JavaScript, React, and Node.js. Experienced in SQL database schemas.

EXPERIENCE:
Software Engineer | WebStudio (2022 - Present)
- Developed and maintained responsive user interfaces using HTML5, CSS3, Tailwind, and React.js.
- Implemented state management using Redux and built robust server-side APIs in Node.js and Express.
- Optimized e-commerce application load speeds, resulting in 25% better conversion rate.
- Integrated payment gateways and managed relational database schemas (MySQL, PostgreSQL).
- Used Git for version control and collaborated in agile sprint teams.

PROJECTS:
Portfolio Builder SPA
- Built a drag-and-drop portfolio creator for designers using React and MongoDB.
- Containerized the frontend using Docker.

EDUCATION:
B.S. in Information Technology | City College

TECHNICAL SKILLS:
- Frontend: HTML, CSS, JavaScript, React, Redux, Sass
- Backend: Node.js, Express, SQL, MySQL, MongoDB
- Tools: Git, Docker, Webpack, Jenkins`,
        jd: `We are looking for a Machine Learning Engineer to join our AI team.

Key Requirements:
- Strong programming skills in Python and SQL.
- Experience building and evaluating ML models using Scikit-Learn.
- Knowledge of Deep Learning frameworks (PyTorch or TensorFlow) and architectures like CNNs and Transformers.
- Familiarity with NLP techniques (embeddings, tokenization) and computer vision pipelines (OpenCV).
- Understanding of probability, statistics, linear algebra, and evaluation metrics (accuracy, F1-score).
- Hands-on experience with MLOps tools: Git, Docker, and cloud platforms like AWS or GCP for API deployment.`
    }
};

// Heuristic Bullet Point Optimizer database
// ==========================================================================
// Initialization & Events
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    checkBackendHealth();
    setupNavigation();
    setupDropzone();
    setupFormEvents();
    setupTabSwitching();
});

// 1. Health check to connect to Python backend
function checkBackendHealth() {
    const dot = document.getElementById('server-status-dot');
    const text = document.getElementById('server-status-text');
    
    fetch(`${API_BASE_URL}/health`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'healthy') {
                dot.classList.remove('offline');
                dot.classList.add('online');
                text.textContent = 'ML Backend Connected';
                showToast('Python ML Backend Connected Successfully!');
            }
        })
        .catch(error => {
            console.error('Backend connection error:', error);
            dot.classList.remove('online');
            dot.classList.add('offline');
            text.textContent = 'ML Backend Offline';
            showToast('Warning: Flask Backend Offline. Start server at 127.0.0.1:5000', 'warning');
        });
}

// 2. Sidebar section switcher
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class
            navButtons.forEach(b => b.classList.remove('active'));
            
            // Add active class
            btn.classList.add('active');
            
            // Switch sections
            const targetId = btn.getAttribute('data-target');
            switchSection(targetId);
        });
    });
}

function switchSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => {
        sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Sync active nav button
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            if (btn.getAttribute('data-target') === sectionId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

// 3. File upload drag-and-drop mechanics
function setupDropzone() {
    const dropzone = document.getElementById('resume-dropzone');
    const fileInput = document.getElementById('resume-file-input');
    const textInput = document.getElementById('resume-text-input');
    const fileInfo = document.getElementById('file-info-container');
    const filenameLabel = document.getElementById('uploaded-filename');
    const removeBtn = document.getElementById('remove-file-btn');
    
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--color-cyan)';
        dropzone.style.backgroundColor = 'rgba(0, 242, 254, 0.05)';
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-color)';
        dropzone.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        dropzone.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });
    
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        textInput.value = '';
        fileInfo.style.display = 'none';
        dropzone.style.display = 'block';
    });
}

// Handle file loading and text extraction
function handleFileUpload(file) {
    const dropzone = document.getElementById('resume-dropzone');
    const fileInfo = document.getElementById('file-info-container');
    const filenameLabel = document.getElementById('uploaded-filename');
    const textInput = document.getElementById('resume-text-input');
    
    filenameLabel.textContent = file.name;
    dropzone.style.display = 'none';
    fileInfo.style.display = 'flex';
    
    showToast(`Loading: ${file.name}`);
    
    const fileReader = new FileReader();
    
    if (file.name.endsWith('.txt')) {
        fileReader.onload = () => {
            textInput.value = fileReader.result;
            showToast('Text resume uploaded successfully!');
        };
        fileReader.readAsText(file);
    } else if (file.name.endsWith('.pdf')) {
        // PDF client-side text parsing using PDF.js
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                let maxPages = pdf.numPages;
                let countPromises = [];
                
                showToast(`Parsing PDF: ${maxPages} pages found...`);
                
                for (let j = 1; j <= maxPages; j++) {
                    let page = pdf.getPage(j);
                    countPromises.push(page.then(pageObj => {
                        return pageObj.getTextContent().then(textContent => {
                            return textContent.items.map(item => item.str).join(' ');
                        });
                    }));
                }
                
                return Promise.all(countPromises).then(texts => {
                    const fullText = texts.join('\n').trim();
                    if (!fullText) {
                        showToast('Extracted text is empty. Scanned PDF or image detected. Please copy and paste text manually!', 'error');
                        textInput.value = '';
                    } else {
                        textInput.value = fullText;
                        showToast('PDF resume parsed successfully!');
                    }
                });
            }).catch(err => {
                console.error("PDF.js error: ", err);
                showToast('Failed to parse PDF file. Ensure it has copyable text.', 'error');
            });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        showToast('Unsupported file type. Please upload a .pdf or .txt file.', 'error');
        fileInput.value = '';
        fileInfo.style.display = 'none';
        dropzone.style.display = 'block';
    }
}

// 4. Form Submission and Preset Events
function setupFormEvents() {
    const presetSelector = document.getElementById('preset-selector');
    const targetRole = document.getElementById('target-role');
    const resumeTextInput = document.getElementById('resume-text-input');
    const jobDescInput = document.getElementById('job-desc-input');
    const btnRunAnalysis = document.getElementById('btn-run-analysis');
    
    // Preset Selector Change Handler
    presetSelector.addEventListener('change', () => {
        const val = presetSelector.value;
        if (PRESETS[val]) {
            targetRole.value = PRESETS[val].role;
            resumeTextInput.value = PRESETS[val].resume;
            jobDescInput.value = PRESETS[val].jd;
            showToast(`Preset "${PRESETS[val].role}" loaded!`);
        }
    });
    
    // Core Analyze Button Handler
    btnRunAnalysis.addEventListener('click', () => {
        const resumeText = resumeTextInput.value.trim();
        const jdText = jobDescInput.value.trim();
        const role = targetRole.value;
        
        if (!resumeText) {
            showToast('Error: Resume text is empty.', 'error');
            return;
        }
        if (!jdText) {
            showToast('Error: Job Description is empty.', 'error');
            return;
        }
        
        executePipeline(resumeText, jdText, role);
    });
}

// 5. Results Tab Switching
function setupTabSwitching() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            // Add active class to selected tab
            tab.classList.add('active');
            
            const paneId = tab.getAttribute('data-tab');
            const pane = document.getElementById(paneId);
            if (pane) {
                pane.classList.add('active');
            }
            
            // Re-render charts once they become visible to avoid Chart.js zero-width/height/hidden canvas errors
            if (analysisData) {
                if (paneId === 'tab-models') {
                    const clfs = analysisData.classifiers;
                    try {
                        drawMiniProbabilityChart('chart-lr-probs', clfs.logistic_regression.probabilities);
                        drawMiniProbabilityChart('chart-dt-probs', clfs.decision_tree.probabilities);
                        drawMiniProbabilityChart('chart-rf-probs', clfs.random_forest.probabilities);
                    } catch (e) {
                        console.error("Error drawing models probability charts on tab switch:", e);
                    }
                }
            }
        });
    });
}

// ==========================================================================
// Pipeline Animator & Fetch API Executor
// ==========================================================================

function executePipeline(resumeText, jdText, role) {
    const emptyView = document.getElementById('empty-dashboard-view');
    const resultsView = document.getElementById('results-dashboard-view');
    const loader = document.getElementById('pipeline-loader');
    
    // Reset views
    emptyView.style.display = 'none';
    resultsView.style.display = 'none';
    loader.style.display = 'block';
    
    // Pipeline loading sequence UI element controls
    const stepNlp = document.getElementById('step-load-nlp');
    const stepTfidf = document.getElementById('step-load-tfidf');
    const stepClf = document.getElementById('step-load-classifiers');
    const stepGap = document.getElementById('step-load-gap');
    
    // Reset pipeline step styles
    [stepNlp, stepTfidf, stepClf, stepGap].forEach(step => {
        step.className = 'p-loader-step';
        step.querySelector('.status-indicator').innerHTML = '<i class="fa-solid fa-circle"></i>';
    });
    
    // Start Animation Sequence
    setTimeout(() => activateStep(stepNlp), 100);
    
    // API Post Request
    const requestData = {
        resume_text: resumeText,
        job_description: jdText,
        target_role: role
    };
    
    fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            analysisData = data;
            
            // Smoothly complete the loading animation sequence
            setTimeout(() => {
                completeStep(stepNlp);
                activateStep(stepTfidf);
                
                setTimeout(() => {
                    completeStep(stepTfidf);
                    activateStep(stepClf);
                    
                    setTimeout(() => {
                        completeStep(stepClf);
                        activateStep(stepGap);
                        
                        setTimeout(() => {
                            completeStep(stepGap);
                            
                            // Visual final rendering of analysis results
                            setTimeout(() => {
                                loader.style.display = 'none';
                                resultsView.style.display = 'block';
                                renderResultsDashboard();
                                showToast('ML Analysis Pipeline Executed Successfully!');
                            }, 500);
                            
                        }, 800);
                    }, 800);
                }, 800);
            }, 800);
        } else {
            throw new Error(data.error || 'Unknown backend error');
        }
    })
    .catch(error => {
        console.error("API error: ", error);
        loader.style.display = 'none';
        emptyView.style.display = 'flex';
        showToast('Error connecting to Flask server. Is it running on 127.0.0.1:5000?', 'error');
    });
}

function activateStep(stepEl) {
    stepEl.classList.add('active');
    stepEl.querySelector('.status-indicator').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
}

function completeStep(stepEl) {
    stepEl.classList.remove('active');
    stepEl.classList.add('completed');
    stepEl.querySelector('.status-indicator').innerHTML = '<i class="fa-solid fa-check"></i>';
}

// ==========================================================================
// Dashboard Renderer Functions
// ==========================================================================

function renderResultsDashboard() {
    if (!analysisData) return;
    
    const meta = analysisData.metadata;
    
    // 1. Overall Score Radial
    const radial = document.getElementById('results-radial-progress');
    const scoreVal = document.getElementById('results-overall-score');
    scoreVal.textContent = `${meta.overall_score}%`;
    
    // SVG radial perimeter mapping (r=40 -> 2 * pi * r = 251.2)
    const dasharray = 251.2;
    const offset = dasharray - (meta.overall_score / 100) * dasharray;
    radial.style.strokeDashoffset = offset;
    
    // 2. Mini KPI Progress Metrics
    animateBarWidth('results-cosine-bar', meta.cosine_similarity);
    document.getElementById('results-cosine-similarity').textContent = `${meta.cosine_similarity}%`;
    
    animateBarWidth('results-skill-bar', meta.skill_match_score);
    document.getElementById('results-skill-score').textContent = `${meta.skill_match_score}%`;
    
    animateBarWidth('results-ats-bar', meta.ats_score);
    document.getElementById('results-ats-score').textContent = `${meta.ats_score}%`;
    
    // 3. TAB 1: NLP Preprocessing Info
    const nlp = analysisData.nlp_preprocessing;
    document.getElementById('nlp-orig-char').textContent = nlp.original_length.toLocaleString();
    document.getElementById('nlp-clean-tokens').textContent = nlp.cleaned_length.toLocaleString();
    
    const tokenCloud = document.getElementById('nlp-token-cloud');
    tokenCloud.innerHTML = '';
    nlp.sample_tokens.forEach(tok => {
        const span = document.createElement('span');
        span.className = 'token-tag';
        span.textContent = tok;
        tokenCloud.appendChild(span);
    });
    
    // 4. TAB 2: TF-IDF Vectors Lists
    const tfidf = analysisData.tfidf_analysis;
    const resumeKeywordsList = document.getElementById('tfidf-resume-keywords');
    const jobKeywordsList = document.getElementById('tfidf-job-keywords');
    
    renderKeywords(resumeKeywordsList, tfidf.resume_top_keywords);
    renderKeywords(jobKeywordsList, tfidf.job_top_keywords);
    
    // 5. TAB 3: Machine Learning Models Predictions & Probabilities
    const clfs = analysisData.classifiers;
    
    renderModelPill('pred-lr', clfs.logistic_regression.prediction);
    renderModelPill('pred-dt', clfs.decision_tree.prediction);
    renderModelPill('pred-rf', clfs.random_forest.prediction);
    
    // Draw Model probability graphs using Chart.js (safely wrapped to prevent crashes when hidden)
    try {
        drawMiniProbabilityChart('chart-lr-probs', clfs.logistic_regression.probabilities);
        drawMiniProbabilityChart('chart-dt-probs', clfs.decision_tree.probabilities);
        drawMiniProbabilityChart('chart-rf-probs', clfs.random_forest.probabilities);
    } catch (e) {
        console.warn("Chart.js probability drawing failed (canvases may be hidden):", e);
    }
    
    // Random Forest Feature Importances Bar Charts
    const rfImportancesContainer = document.getElementById('rf-feature-importances');
    rfImportancesContainer.innerHTML = '';
    
    clfs.random_forest.feature_importances.forEach(fi => {
        const row = document.createElement('div');
        row.className = 'fi-bar-row';
        
        const importancePercentage = Math.round(fi.importance * 100);
        
        row.innerHTML = `
            <span class="fi-label">${fi.feature}</span>
            <div class="fi-bar-container-wrapper">
                <div class="fi-bar-bg">
                    <div class="fi-bar-fill" style="width: ${importancePercentage}%"></div>
                </div>
                <span class="fi-value">${fi.importance.toFixed(3)}</span>
            </div>
        `;
        rfImportancesContainer.appendChild(row);
    });
    
    // 6. TAB 4: Skill Gaps breakdown
    const skills = analysisData.skill_gap_analysis;
    
    // Render categories scores in CSS progress bars
    const skillsBars = document.getElementById('gap-skills-bars');
    if (skillsBars) {
        skillsBars.innerHTML = '';
        
        const colors = {
            languages: 'var(--color-cyan)',
            math_stats: 'var(--color-indigo)',
            ml_core: 'var(--color-purple)',
            deep_learning: 'var(--color-pink)',
            mlops_tools: 'var(--color-mint)'
        };
        
        for (const [category, score] of Object.entries(skills.category_scores)) {
            const row = document.createElement('div');
            row.className = 'skill-bar-row-item';
            
            const catTitle = category.replace('_', ' ').toUpperCase();
            const color = colors[category] || 'var(--color-cyan)';
            
            row.innerHTML = `
                <div class="skill-bar-info">
                    <span class="skill-bar-label">${catTitle}</span>
                    <span class="skill-bar-val">${score}%</span>
                </div>
                <div class="skill-bar-bg-container">
                    <div class="skill-bar-fill-indicator" style="width: ${score}%; background: ${color}"></div>
                </div>
            `;
            skillsBars.appendChild(row);
        }
    }
    
    // Populate matched vs. missing items lists
    const gapInventory = document.getElementById('gap-inventory-container');
    gapInventory.innerHTML = '';
    
    for (const [category, matchArray] of Object.entries(skills.matched_skills)) {
        const missingArray = skills.missing_skills[category] || [];
        const score = skills.category_scores[category] !== undefined ? skills.category_scores[category] : 100;
        
        // Skip listing categories that have absolutely no required skills defined in the job description
        if (matchArray.length === 0 && missingArray.length === 0) continue;
        
        const section = document.createElement('div');
        section.className = 'inventory-category-row';
        
        const catTitle = category.replace('_', ' ').toUpperCase();
        
        let chipsHTML = '';
        matchArray.forEach(s => {
            chipsHTML += `<span class="skill-chip match">${s.replace('_', ' ').toUpperCase()}</span>`;
        });
        missingArray.forEach(s => {
            chipsHTML += `<span class="skill-chip missing">${s.replace('_', ' ').toUpperCase()}</span>`;
        });
        
        section.innerHTML = `
            <h5>
                <span>${catTitle}</span>
                <span class="cat-score-percent">${score}%</span>
            </h5>
            <div class="inventory-chips">
                ${chipsHTML}
            </div>
        `;
        
        gapInventory.appendChild(section);
    }
    
    // 7. Upskilling Recommendations List (Moved inside Skill Gaps tab)
    const recsContainer = document.getElementById('gap-recs-container');
    if (recsContainer) {
        recsContainer.innerHTML = '';
        
        analysisData.recommendations.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'recommendation-card';
            card.innerHTML = `
                <div class="rec-meta-header">
                    <span class="rec-category">${rec.category}</span>
                    <span class="rec-difficulty">High Priority</span>
                </div>
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
                <div class="rec-action-box">
                    <h6>Actionable Project/Course Suggestion:</h6>
                    <p>${rec.action}</p>
                </div>
            `;
            recsContainer.appendChild(card);
        });
    }
}

function animateBarWidth(elementId, width) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.width = '0%';
        setTimeout(() => {
            el.style.width = `${width}%`;
        }, 100);
    }
}

function renderKeywords(containerEl, keywordsArray) {
    containerEl.innerHTML = '';
    if (keywordsArray.length === 0) {
        containerEl.innerHTML = '<p class="small-desc text-muted">No keywords registered.</p>';
        return;
    }
    
    keywordsArray.forEach(kw => {
        const item = document.createElement('div');
        item.className = 'keyword-item';
        
        const percent = Math.min(100, Math.round(kw.weight * 200));  // Scale up weight for nicer relative visual width
        
        item.innerHTML = `
            <span class="keyword-word">${kw.word}</span>
            <div class="keyword-weight-bar-wrapper">
                <div class="keyword-weight-bar-container">
                    <div class="keyword-weight-bar" style="width: ${percent}%"></div>
                </div>
                <span class="keyword-weight-val">${kw.weight.toFixed(3)}</span>
            </div>
        `;
        containerEl.appendChild(item);
    });
}

function renderModelPill(elementId, prediction) {
    const el = document.getElementById(elementId);
    el.textContent = prediction;
    
    // Reset classification classes
    el.className = 'prediction-pill';
    const pred_lower = prediction.toLowerCase();
    
    if (pred_lower.includes('highly')) {
        el.classList.add('highly-suitable');
    } else if (pred_lower.includes('moderately')) {
        el.classList.add('moderately-suitable');
    } else {
        el.classList.add('not-suitable');
    }
}

// Chart.js - Render 3 miniature bar charts showing class probability
function drawMiniProbabilityChart(canvasId, probabilities) {
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Unsuitable', 'Moderate', 'Suitable'],
            datasets: [{
                data: [
                    probabilities.not_suitable * 100,
                    probabilities.moderately_suitable * 100,
                    probabilities.highly_suitable * 100
                ],
                backgroundColor: [
                    'rgba(255, 94, 98, 0.65)',
                    'rgba(250, 217, 97, 0.65)',
                    'rgba(5, 193, 128, 0.65)'
                ],
                borderColor: [
                    '#FF5E62',
                    '#FAD961',
                    '#05C180'
                ],
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#9CA3AF', font: { size: 9 } }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: { color: '#6B7280', font: { size: 8 }, stepSize: 50 },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' }
                }
            }
        }
    });
}

// ==========================================================================
// Core Utilities
// ==========================================================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    // Set style color based on type
    if (type === 'error') {
        toast.style.borderColor = 'var(--color-red)';
        toast.style.boxShadow = '0 10px 25px rgba(255, 94, 98, 0.15)';
    } else if (type === 'warning') {
        toast.style.borderColor = 'var(--color-gold)';
        toast.style.boxShadow = '0 10px 25px rgba(250, 217, 97, 0.15)';
    } else {
        toast.style.borderColor = 'var(--color-cyan)';
        toast.style.boxShadow = '0 10px 25px rgba(0, 242, 254, 0.15)';
    }
    
    toast.classList.add('show');
    
    // Clear toast
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function copyToClipboard(elementId) {
    const copyText = document.getElementById(elementId).innerText || document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(copyText).then(() => {
        showToast('Text copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy text', 'error');
    });
}
