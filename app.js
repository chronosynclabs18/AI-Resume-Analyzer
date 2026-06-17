// ==========================================================================
// Frontend JavaScript Controller: AI-Verify Intelligent Hiring
// Handles Authentication, Navigation, File Uploads, Charts, and API Integrations
// ==========================================================================

const API_BASE_URL = 'http://127.0.0.1:5000';

// App Global State
let JWT_TOKEN = localStorage.getItem('jwt_token');
let CURRENT_USER = null;
let ALL_JOBS = [];
let CANDIDATE_APPLICATIONS = [];
let RECRUITER_APPLICATIONS = [];
let FILTERED_APPLICATIONS = [];
let CHARTS = {};
let UPLOADED_FILES = {
    resume: null,
    aadhaar: null,
    pan: null,
    cert: null
};
let ACTIVE_MODAL_APP_ID = null;

// ==========================================================================
// 1. App Initialization & Bootstrapping
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    checkBackendHealth();
    setupThemeToggle();
    setupNavigation();
    setupDropzones();
    checkAuthSession();
});

// Health check to connect to Python backend
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
            }
        })
        .catch(error => {
            console.error('Backend connection error:', error);
            dot.classList.remove('online');
            dot.classList.add('offline');
            text.textContent = 'ML Backend Offline';
            showToast('Flask Backend Offline. Start server at 127.0.0.1:5000', 'warning');
        });
}

// ==========================================================================
// 2. Authentication Controllers
// ==========================================================================

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTabBtn = document.getElementById('tab-login-btn');
    const registerTabBtn = document.getElementById('tab-register-btn');

    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        loginTabBtn.classList.remove('active');
        registerTabBtn.classList.add('active');
    }
}

function handleAuthSubmit(event, type) {
    event.preventDefault();
    let url = `${API_BASE_URL}/api/auth/login`;
    let payload = {};

    if (type === 'login') {
        payload.username = document.getElementById('login-username').value.trim();
        payload.password = document.getElementById('login-password').value.trim();
    } else {
        url = `${API_BASE_URL}/api/auth/register`;
        payload.username = document.getElementById('reg-username').value.trim();
        payload.email = document.getElementById('reg-email').value.trim();
        payload.password = document.getElementById('reg-password').value.trim();
        payload.role = document.getElementById('reg-role').value;
    }

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || 'Request failed') });
        }
        return res.json();
    })
    .then(data => {
        if (data.status === 'success') {
            JWT_TOKEN = data.token;
            localStorage.setItem('jwt_token', data.token);
            CURRENT_USER = data.user;
            
            showToast(`${type === 'login' ? 'Logged in' : 'Registered'} successfully! Welcome ${CURRENT_USER.username}.`);
            
            // Clean forms
            document.getElementById('login-form').reset();
            document.getElementById('register-form').reset();
            
            setupAuthenticatedUI();
        }
    })
    .catch(err => {
        showToast(err.message, 'error');
    });
}

function checkAuthSession() {
    if (!JWT_TOKEN) {
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        return;
    }

    fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Session expired');
        }
        return res.json();
    })
    .then(user => {
        CURRENT_USER = user;
        setupAuthenticatedUI();
    })
    .catch(err => {
        console.warn(err.message);
        handleLogout();
    });
}

function handleLogout() {
    JWT_TOKEN = null;
    CURRENT_USER = null;
    localStorage.removeItem('jwt_token');
    
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    
    showToast('Logged out successfully.');
}

function setupAuthenticatedUI() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    // Header updates
    document.getElementById('user-display-name').textContent = CURRENT_USER.username;
    document.getElementById('user-role-badge').textContent = CURRENT_USER.role;
    document.getElementById('user-avatar-initials').textContent = CURRENT_USER.username[0].toUpperCase();

    // Toggle Role Badges
    const badge = document.getElementById('user-role-badge');
    badge.className = 'role-tag ' + CURRENT_USER.role;

    // Sidebar role filtering
    const candidateOnlyElements = document.querySelectorAll('.candidate-only');
    const recruiterOnlyElements = document.querySelectorAll('.recruiter-only');

    if (CURRENT_USER.role === 'candidate') {
        candidateOnlyElements.forEach(el => el.style.display = 'block');
        recruiterOnlyElements.forEach(el => el.style.display = 'none');
        switchSection('section-candidate-dashboard');
        loadCandidateDashboard();
        loadAvailableJobs();
    } else {
        candidateOnlyElements.forEach(el => el.style.display = 'none');
        recruiterOnlyElements.forEach(el => el.style.display = 'block');
        switchSection('section-recruiter-dashboard');
        loadRecruiterDashboard();
    }
}

// ==========================================================================
// 3. Navigation Controls
// ==========================================================================

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            switchSection(targetId);
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    const btn = document.querySelector(`.nav-btn[data-target="${sectionId}"]`);
    if (btn) {
        btn.classList.add('active');
    }

    // Refresh context data when entering panels
    if (sectionId === 'section-candidate-dashboard') {
        loadCandidateDashboard();
    } else if (sectionId === 'section-skill-gap') {
        loadCandidateDashboard();
    } else if (sectionId === 'section-recruiter-dashboard') {
        loadRecruiterDashboard();
    } else if (sectionId === 'section-recruiter-database') {
        loadRecruiterCandidates();
    } else if (sectionId === 'section-audit-logs') {
        loadAuditLogs();
    } else if (sectionId === 'section-apply-job') {
        loadAvailableJobs();
    }
}

// ==========================================================================
// 4. File Upload Drag-and-Drop Dropzone Setup
// ==========================================================================

function setupDropzones() {
    setupSingleDropzone('dropzone-resume', 'file-resume', 'lbl-resume', 'resume');
    setupSingleDropzone('dropzone-aadhaar', 'file-aadhaar', 'lbl-aadhaar', 'aadhaar');
    setupSingleDropzone('dropzone-pan', 'file-pan', 'lbl-pan', 'pan');
    setupSingleDropzone('dropzone-cert', 'file-cert', 'lbl-cert', 'cert');
}

function setupSingleDropzone(zoneId, inputId, labelId, key) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--color-cyan)';
        zone.style.backgroundColor = 'rgba(0, 242, 254, 0.04)';
    });

    zone.addEventListener('dragleave', () => {
        zone.style.borderColor = 'var(--border-color)';
        zone.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--border-color)';
        zone.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
        if (e.dataTransfer.files.length > 0) {
            storeFile(e.dataTransfer.files[0], label, key);
        }
    });

    input.addEventListener('change', () => {
        if (input.files.length > 0) {
            storeFile(input.files[0], label, key);
        }
    });
}

function storeFile(file, labelElement, key) {
    UPLOADED_FILES[key] = file;
    labelElement.textContent = `Selected: ${file.name}`;
    labelElement.style.color = 'var(--color-mint)';
    showToast(`Loaded document: ${file.name}`);
}

function resetUploads() {
    UPLOADED_FILES = { resume: null, aadhaar: null, pan: null, cert: null };
    document.getElementById('lbl-resume').textContent = "Drag & Drop Resume, or click to browse";
    document.getElementById('lbl-aadhaar').textContent = "Drag & Drop Aadhaar, or click to browse";
    document.getElementById('lbl-pan').textContent = "Drag & Drop PAN Card, or click to browse";
    document.getElementById('lbl-cert').textContent = "Drag & Drop Cert, or click to browse";
    
    document.querySelectorAll('.dropzone p').forEach(el => el.style.color = 'var(--text-secondary)');
    document.getElementById('file-resume').value = '';
    document.getElementById('file-aadhaar').value = '';
    document.getElementById('file-pan').value = '';
    document.getElementById('file-cert').value = '';
}

// ==========================================================================
// 5. Candidate Dashboards & Screenings Submit
// ==========================================================================

function loadAvailableJobs() {
    fetch(`${API_BASE_URL}/api/jobs`)
        .then(res => res.json())
        .then(jobs => {
            ALL_JOBS = jobs;
            const select = document.getElementById('apply-job-select');
            
            // Retain placeholder & custom
            select.innerHTML = '<option value="" disabled selected>-- Select target job post --</option>';
            jobs.forEach(job => {
                select.innerHTML += `<option value="${job.id}">${job.title} (${job.company})</option>`;
            });
            select.innerHTML += '<option value="custom">Submit Custom Job Description...</option>';
        });
}

function handleJobDropdownChange() {
    const select = document.getElementById('apply-job-select');
    const group = document.getElementById('apply-custom-jd-group');
    if (select.value === 'custom') {
        group.style.display = 'flex';
    } else {
        group.style.display = 'none';
    }
}

function handleApplicationSubmit() {
    const select = document.getElementById('apply-job-select');
    const customJd = document.getElementById('apply-custom-jd').value.trim();
    
    if (!select.value) {
        showToast('Please select a target job position.', 'error');
        return;
    }
    if (select.value === 'custom' && !customJd) {
        showToast('Please paste a custom job description requirements.', 'error');
        return;
    }
    if (!UPLOADED_FILES.resume) {
        showToast('Resume file upload is mandatory.', 'error');
        return;
    }

    // Prepare FormData
    const formData = new FormData();
    if (select.value !== 'custom') {
        formData.append('job_id', select.value);
        const selectedJob = ALL_JOBS.find(j => j.id == select.value);
        formData.append('target_role', selectedJob ? selectedJob.title : '');
    } else {
        formData.append('custom_jd', customJd);
        formData.append('target_role', 'Custom Screen Candidate');
    }

    formData.append('resume', UPLOADED_FILES.resume);
    if (UPLOADED_FILES.aadhaar) formData.append('aadhaar', UPLOADED_FILES.aadhaar);
    if (UPLOADED_FILES.pan) formData.append('pan', UPLOADED_FILES.pan);
    if (UPLOADED_FILES.cert) formData.append('cert', UPLOADED_FILES.cert);

    // Loader animations
    document.getElementById('apply-waiting-view').style.display = 'none';
    const loader = document.getElementById('apply-pipeline-loader');
    loader.style.display = 'block';

    const stepParse = document.getElementById('apply-step-parse');
    const stepOcr = document.getElementById('apply-step-ocr');
    const stepScoring = document.getElementById('apply-step-scoring');
    const stepFraud = document.getElementById('apply-step-fraud');

    // Reset steps
    [stepParse, stepOcr, stepScoring, stepFraud].forEach(step => {
        step.className = 'p-loader-step';
        step.querySelector('.status-indicator').innerHTML = '<i class="fa-solid fa-circle"></i>';
    });

    // Animate UI Pipeline Stages
    setTimeout(() => activateStep(stepParse), 200);

    fetch(`${API_BASE_URL}/api/applications/apply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` },
        body: formData
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || 'Apply failed') });
        }
        return res.json();
    })
    .then(data => {
        if (data.status === 'success') {
            setTimeout(() => {
                completeStep(stepParse);
                activateStep(stepOcr);

                setTimeout(() => {
                    completeStep(stepOcr);
                    activateStep(stepScoring);

                    setTimeout(() => {
                        completeStep(stepScoring);
                        activateStep(stepFraud);

                        setTimeout(() => {
                            completeStep(stepFraud);

                            setTimeout(() => {
                                loader.style.display = 'none';
                                document.getElementById('apply-waiting-view').style.display = 'flex';
                                showToast('Application submitted & AI evaluated successfully!');
                                
                                resetUploads();
                                document.getElementById('apply-custom-jd').value = '';
                                select.value = '';
                                
                                switchSection('section-candidate-dashboard');
                            }, 500);
                        }, 800);
                    }, 800);
                }, 800);
            }, 800);
        }
    })
    .catch(err => {
        loader.style.display = 'none';
        document.getElementById('apply-waiting-view').style.display = 'flex';
        showToast(err.message, 'error');
    });
}

function activateStep(el) {
    el.classList.add('active');
    el.querySelector('.status-indicator').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
}

function completeStep(el) {
    el.classList.remove('active');
    el.classList.add('completed');
    el.querySelector('.status-indicator').innerHTML = '<i class="fa-solid fa-check"></i>';
}

function loadCandidateDashboard() {
    fetch(`${API_BASE_URL}/api/applications/candidate`, {
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    })
    .then(res => res.json())
    .then(apps => {
        CANDIDATE_APPLICATIONS = apps;
        const emptyView = document.getElementById('candidate-dashboard-empty');
        const filledView = document.getElementById('candidate-dashboard-filled');

        if (apps.length === 0) {
            emptyView.style.display = 'block';
            filledView.style.display = 'none';
            document.getElementById('btn-skill-gap').style.display = 'none';
        } else {
            emptyView.style.display = 'none';
            filledView.style.display = 'block';
            document.getElementById('btn-skill-gap').style.display = 'block';

            // Bind latest application details
            const latest = apps[0];
            
            // 1. Overall Stepper Update
            renderStatusStepper(latest.status);

            // 2. Metrics texts
            document.getElementById('cand-overall-score-txt').textContent = `${latest.overall_score}%`;
            document.getElementById('cand-skill-score-txt').textContent = `${latest.skill_match_score}%`;
            document.getElementById('cand-verif-score-txt').textContent = `${latest.verification_score}%`;
            
            const badge = document.getElementById('cand-suitability-badge');
            badge.className = 'badge-suitability ' + latest.fit_recommendation.toLowerCase().replace(' ', '-');
            badge.textContent = latest.fit_recommendation;

            // 3. Document details verification status
            fetch(`${API_BASE_URL}/api/applications/${latest.id}/report`, {
                headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
            })
            .then(res => res.json())
            .then(report => {
                const verif = report.verification_details;
                updateStatusBadge('cand-aadhaar-badge', verif.aadhaar_status);
                updateStatusBadge('cand-pan-badge', verif.pan_status);
                updateStatusBadge('cand-name-badge', verif.name_match_status);

                // Bind skill gaps analysis directly
                renderSkillGapSection(report);
            });
        }
    });
}

function renderStatusStepper(status) {
    const steps = ['Applied', 'Under Review', 'Interview Scheduled', 'Accepted', 'Rejected'];
    const bar = document.getElementById('candidate-stepper-progress');
    
    // Clear styles
    document.querySelectorAll('.step-node').forEach(node => {
        node.classList.remove('active', 'completed');
    });

    const decisionCircle = document.getElementById('step-decision-circle');
    const decisionLabel = document.getElementById('step-decision-label');

    // Default decision labels
    decisionCircle.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    decisionLabel.textContent = 'Decision';

    let activeIdx = 0;
    if (status === 'Applied') {
        activeIdx = 0;
        document.getElementById('step-applied').classList.add('active');
    } else if (status === 'Under Review') {
        activeIdx = 1;
        document.getElementById('step-applied').classList.add('completed');
        document.getElementById('step-review').classList.add('active');
    } else if (status === 'Interview Scheduled') {
        activeIdx = 2;
        document.getElementById('step-applied').classList.add('completed');
        document.getElementById('step-review').classList.add('completed');
        document.getElementById('step-interview').classList.add('active');
    } else if (status === 'Accepted') {
        activeIdx = 3;
        document.getElementById('step-applied').classList.add('completed');
        document.getElementById('step-review').classList.add('completed');
        document.getElementById('step-interview').classList.add('completed');
        
        const decision = document.getElementById('step-decision');
        decision.classList.add('completed');
        decisionCircle.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        decisionLabel.textContent = 'Accepted';
    } else if (status === 'Rejected') {
        activeIdx = 3;
        document.getElementById('step-applied').classList.add('completed');
        document.getElementById('step-review').classList.add('completed');
        document.getElementById('step-interview').classList.add('completed');
        
        const decision = document.getElementById('step-decision');
        decision.classList.add('completed');
        decisionCircle.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        decisionCircle.style.background = 'var(--color-red)';
        decisionLabel.textContent = 'Rejected';
        decisionLabel.style.color = 'var(--color-red)';
    }

    // Set line progress bar percentage
    const widthPercentage = (activeIdx / 3) * 100;
    bar.style.width = `${widthPercentage}%`;
}

function updateStatusBadge(elementId, status) {
    const el = document.getElementById(elementId);
    el.textContent = status;
    el.className = 'status-badge';
    
    if (status === 'Verified') {
        el.classList.add('verified');
    } else if (status === 'Pending' || status === 'Partial Match') {
        el.classList.add('pending');
    } else {
        el.classList.add('missing');
    }
}

function renderSkillGapSection(report) {
    document.getElementById('skill-gap-empty-view').style.display = 'none';
    document.getElementById('skill-gap-dashboard-view').style.display = 'block';

    // Scores
    document.getElementById('gap-overall-score-txt').textContent = `${report.scores.overall}%`;
    document.getElementById('gap-skill-score-num').textContent = `${report.scores.skill_match}%`;
    document.getElementById('gap-cosine-score-num').textContent = `${report.scores.overall}%`; // simulated representation

    document.getElementById('gap-skill-fill').style.width = `${report.scores.skill_match}%`;
    document.getElementById('gap-cosine-fill').style.width = `${report.scores.overall}%`;

    // Radial Dashoffset
    const radial = document.getElementById('gap-radial-progress');
    const dasharray = 251.2;
    radial.style.strokeDashoffset = dasharray - (report.scores.overall / 100) * dasharray;

    // Binders
    // Skill bars category matching
    const barsContainer = document.getElementById('gap-bars-container');
    barsContainer.innerHTML = '';
    const colors = {
        languages: 'var(--color-cyan)',
        math_stats: 'var(--color-indigo)',
        ml_core: 'var(--color-purple)',
        deep_learning: 'var(--color-pink)',
        mlops_tools: 'var(--color-mint)'
    };
    
    // Simulate category scores based on match overlap
    const skills = report.matched_skills;
    const missing = report.missing_skills;
    const categories = Object.keys(skills);
    for (const category of categories) {
        const matches = skills[category] || [];
        const misses = missing[category] || [];
        const total = matches.length + misses.length;
        const score = total > 0 ? Math.round((matches.length / total) * 100) : 100;

        barsContainer.innerHTML += `
            <div class="skill-bar-row-item">
                <div class="skill-bar-info">
                    <span>${category.replace('_', ' ').toUpperCase()}</span>
                    <span>${score}%</span>
                </div>
                <div class="skill-bar-bg-container">
                    <div class="skill-bar-fill-indicator" style="width: ${score}%; background: ${colors[category] || 'var(--color-cyan)'}"></div>
                </div>
            </div>
        `;
    }

    // Chips matching list
    const chipsContainer = document.getElementById('gap-chips-container');
    chipsContainer.innerHTML = '';
    for (const [cat, matchArray] of Object.entries(skills)) {
        const missArray = missing[cat] || [];
        if (matchArray.length === 0 && missArray.length === 0) continue;

        let chips = '';
        matchArray.forEach(s => chips += `<span class="skill-chip match">${s.toUpperCase()}</span>`);
        missArray.forEach(s => chips += `<span class="skill-chip missing">${s.toUpperCase()}</span>`);

        chipsContainer.innerHTML += `
            <div class="inventory-category-row">
                <h5>${cat.replace('_', ' ').toUpperCase()}</h5>
                <div class="inventory-chips">${chips}</div>
            </div>
        `;
    }

    // Recommendations
    const recsContainer = document.getElementById('gap-recs-container');
    recsContainer.innerHTML = '';
    
    // Generate recommendation cards
    let hasGaps = false;
    const templates = {
        languages: { title: "Core Programming Skills", action: "Recommendation: Complete Coursera courses in Advanced Python/SQL queries and practice building database structures." },
        math_stats: { title: "Mathematical & Statistical Foundation", action: "Recommendation: Review standard statistical hypothesis testing, linear algebra matrices, and eigenvalue mathematics." },
        ml_core: { title: "Classical Predictive Machine Learning", action: "Recommendation: Train models on Kaggle notebooks, focusing on cross-validation, hyperparameter grid search, and precision recall." },
        deep_learning: { title: "Deep Learning & Neural Architectures", action: "Recommendation: Build CNN classifiers in PyTorch, or fine-tune Transformer models (BERT/GPT) using the HuggingFace library." },
        mlops_tools: { title: "MLOps Deployment & Infrastructure", action: "Recommendation: Deploy a FastAPI web server inside Docker containers and configure simple CI/CD Git integration." }
    };

    for (const [cat, missArray] of Object.entries(missing)) {
        if (missArray.length > 0) {
            hasGaps = true;
            const temp = templates[cat] || { title: "General Skill Improvement", action: "Practice building portfolio projects and publishing on GitHub." };
            recsContainer.innerHTML += `
                <div class="recommendation-card">
                    <div class="rec-meta-header">
                        <span class="rec-category">${cat.replace('_', ' ').toUpperCase()}</span>
                        <span class="rec-difficulty">High Priority</span>
                    </div>
                    <h4>${temp.title}</h4>
                    <p>Missing elements: ${missArray.map(s => s.toUpperCase()).join(', ')}.</p>
                    <div class="rec-action-box">
                        <h6>Actionable Upskilling Path:</h6>
                        <p>${temp.action}</p>
                    </div>
                </div>
            `;
        }
    }

    if (!hasGaps) {
        recsContainer.innerHTML = `
            <div class="recommendation-card">
                <div class="rec-meta-header">
                    <span class="rec-category">General</span>
                    <span class="rec-difficulty">Complete Overlap</span>
                </div>
                <h4>Exceptional Skill Matching Profile!</h4>
                <p>Your resume satisfies all required parameters defined in the Job Description.</p>
                <div class="rec-action-box">
                    <h6>Recommended Action:</h6>
                    <p>Highlight quantitative achievements and prepare for architectural design interview questions.</p>
                </div>
            </div>
        `;
    }
    
    setupSubTabs();
}

function setupSubTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const paneId = btn.getAttribute('data-tab');
            if (paneId.includes('-sub')) {
                // Skills dashboard tabs
                document.querySelectorAll('[data-tab$="-sub"]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.getElementById('tab-gap-sub').classList.remove('active');
                document.getElementById('tab-recs-sub').classList.remove('active');
                document.getElementById(paneId).classList.add('active');
            }
        });
    });
}

// ==========================================================================
// 6. Recruiter Admin Dashboards & Candidate Database Table
// ==========================================================================

function loadRecruiterDashboard() {
    fetch(`${API_BASE_URL}/api/recruiter/analytics`, {
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    })
    .then(res => res.json())
    .then(data => {
        // Bind stat cards
        document.getElementById('stat-total-apps').textContent = data.total_applicants;
        document.getElementById('stat-avg-score').textContent = `${data.average_fit_score}%`;
        document.getElementById('stat-fraud-cases').textContent = data.flagged_fraud_count;
        document.getElementById('stat-verif-rate').textContent = `${data.verification_pass_rate}%`;

        // Render charts
        renderRecruiterAnalyticsCharts(data);
    });
}

function renderRecruiterAnalyticsCharts(data) {
    // 1. Funnel Chart (Horizontal Bar)
    drawBarChart('chart-funnel', 
        Object.keys(data.status_funnel), 
        Object.values(data.status_funnel), 
        'Application Counts', 
        ['#4FACFE', '#A18CD1', '#FAD961', '#05C180', '#FF5E62']
    );

    // 2. Suitability Pie
    drawPieChart('chart-suitability',
        Object.keys(data.suitability_distribution),
        Object.values(data.suitability_distribution),
        ['#05C180', '#4FACFE', '#FAD961', '#FF5E62']
    );

    // 3. Fraud risk shares
    drawBarChart('chart-fraud-shares',
        Object.keys(data.fraud_risk_shares),
        Object.values(data.fraud_risk_shares),
        'Audit Flags Count',
        ['#FF5E62', '#FAD961', '#05C180']
    );

    // 4. Avg Score (Simulated radar category scores)
    drawBarChart('chart-radar-average',
        ['Skills', 'Experience', 'Education', 'Verification'],
        [75, 60, 80, 85],
        'Category Average Score (%)',
        ['#A18CD1', '#4FACFE', '#05C180', '#00F2FE']
    );

    // 5. Verification passes
    drawPieChart('chart-verif-passes',
        ['Verified Passes', 'Failed Checks'],
        [data.verification_pass_rate, 100 - data.verification_pass_rate],
        ['#05C180', '#FF5E62']
    );
}

function drawBarChart(canvasId, labels, data, datasetLabel, colors) {
    if (CHARTS[canvasId]) CHARTS[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    CHARTS[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: datasetLabel,
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9CA3AF' } },
                x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
            }
        }
    });
}

function drawPieChart(canvasId, labels, data, colors) {
    if (CHARTS[canvasId]) CHARTS[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    CHARTS[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#9CA3AF', boxWidth: 12, font: { size: 10 } } } }
        }
    });
}

function loadRecruiterCandidates() {
    fetch(`${API_BASE_URL}/api/applications/recruiter`, {
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    })
    .then(res => res.json())
    .then(apps => {
        RECRUITER_APPLICATIONS = apps;
        handleCandidateFilters();
    });
}

function handleCandidateFilters() {
    const suitabilityFilter = document.getElementById('filter-suitability').value;
    const statusFilter = document.getElementById('filter-status').value;
    const fraudFilter = document.getElementById('filter-fraud').value;

    FILTERED_APPLICATIONS = RECRUITER_APPLICATIONS.filter(app => {
        // Suitability
        if (suitabilityFilter !== 'all' && app.fit_recommendation !== suitabilityFilter) return false;
        
        // Status
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;

        // Fraud
        if (fraudFilter === 'flagged' && app.fraud_risk_score < 50) return false;
        if (fraudFilter === 'clean' && app.fraud_risk_score >= 50) return false;

        return true;
    });

    renderCandidatesTable();
}

function renderCandidatesTable() {
    const tbody = document.getElementById('recruiter-candidates-tbody');
    tbody.innerHTML = '';

    if (FILTERED_APPLICATIONS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No candidates match selected filter conditions.</td></tr>';
        return;
    }

    FILTERED_APPLICATIONS.forEach(app => {
        // Suitability Badges
        const recClass = app.fit_recommendation.toLowerCase().replace(' ', '-');
        
        // Fraud Meter Badge
        let fraudClass = 'low-risk';
        if (app.fraud_risk_score >= 50) {
            fraudClass = 'high-risk';
        } else if (app.fraud_risk_score >= 20) {
            fraudClass = 'medium-risk';
        }

        tbody.innerHTML += `
            <tr>
                <td>
                    <strong>${app.candidate_name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${app.candidate_email}</div>
                </td>
                <td>${app.job_title}</td>
                <td>
                    <span class="badge-suitability ${recClass}">${app.fit_recommendation} (${app.overall_score}%)</span>
                </td>
                <td>
                    <span class="badge-fraud-meter ${fraudClass}">${app.fraud_risk_score}% Risk</span>
                </td>
                <td>
                    <strong class="${app.verification_score >= 70 ? 'text-mint' : 'text-red'}">${app.verification_score}% Pass</strong>
                </td>
                <td>
                    <span style="font-size: 0.8rem; font-weight: 500;">${app.status}</span>
                </td>
                <td>
                    <button class="rec-action-btn" onclick="openCandidateModal(${app.id})"><i class="fa-solid fa-folder-open"></i> Analyze</button>
                </td>
            </tr>
        `;
    });
}

// ==========================================================================
// 7. Candidate Detailed Modal (Report, Notes, Status updates)
// ==========================================================================

function openCandidateModal(appId) {
    ACTIVE_MODAL_APP_ID = appId;
    const modal = document.getElementById('candidate-detail-modal');

    // Fetch full application analysis report
    fetch(`${API_BASE_URL}/api/applications/${appId}/report`, {
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    })
    .then(res => res.json())
    .then(report => {
        // Bind header information
        document.getElementById('modal-candidate-name').textContent = `${report.candidate_name} - Evaluation Profile`;
        document.getElementById('modal-candidate-email').textContent = `Email: ${report.candidate_email} | Job target: ${report.job_title} (${report.company})`;

        // Side metrics scores
        document.getElementById('modal-overall-score-txt').textContent = `${report.scores.overall}%`;
        document.getElementById('m-val-skill').textContent = `${report.scores.skill_match}%`;
        document.getElementById('m-val-exp').textContent = `${report.scores.experience}%`;
        document.getElementById('m-val-edu').textContent = `${report.scores.education}%`;
        document.getElementById('m-val-cert').textContent = `${report.scores.certification}%`;

        document.getElementById('m-fill-skill').style.width = `${report.scores.skill_match}%`;
        document.getElementById('m-fill-exp').style.width = `${report.scores.experience}%`;
        document.getElementById('m-fill-edu').style.width = `${report.scores.education}%`;
        document.getElementById('m-fill-cert').style.width = `${report.scores.certification}%`;

        const radial = document.getElementById('modal-radial-progress');
        const dasharray = 251.2;
        radial.style.strokeDashoffset = dasharray - (report.scores.overall / 100) * dasharray;

        const suitBadge = document.getElementById('modal-suitability-badge');
        suitBadge.className = 'badge-suitability ' + report.fit_recommendation.toLowerCase().replace(' ', '-');
        suitBadge.textContent = report.fit_recommendation;

        // Modal Tab 1: Verification OCR details
        const verif = report.verification_details;
        updateStatusBadge('m-verif-aadhaar', verif.aadhaar_status);
        updateStatusBadge('m-verif-pan', verif.pan_status);
        updateStatusBadge('m-verif-name', verif.name_match_status);
        document.getElementById('m-verif-fuzzy-num').textContent = `${verif.name_match_percentage}%`;
        document.getElementById('m-details-aadhaar').textContent = verif.aadhaar_number || 'Not Extracted';
        document.getElementById('m-details-pan').textContent = verif.pan_number || 'Not Extracted';

        // OCR Logs window
        const logsBox = document.getElementById('modal-ocr-logs-box');
        logsBox.innerHTML = '';
        verif.ocr_logs.forEach(log => {
            logsBox.innerHTML += `<div>&gt; ${log}</div>`;
        });

        // Modal Tab 2: Fraud Audit details
        const fraud = report.fraud_details;
        document.getElementById('modal-fraud-score-num').textContent = `${fraud.score}%`;
        
        const fraudBadge = document.getElementById('modal-fraud-risk-badge');
        fraudBadge.textContent = fraud.score >= 50 ? 'High Risk' : (fraud.score >= 20 ? 'Medium Risk' : 'Low Risk');
        fraudBadge.className = 'badge-fraud-meter ' + (fraud.score >= 50 ? 'high-risk' : (fraud.score >= 20 ? 'medium-risk' : 'low-risk'));

        const indicatorBox = document.getElementById('modal-fraud-indicator-box');
        indicatorBox.className = 'fraud-indicator-panel ' + (fraud.score >= 50 ? 'high-risk' : 'low-risk');
        
        const detailsUl = document.getElementById('modal-fraud-details-ul');
        detailsUl.innerHTML = '';
        fraud.details.forEach(detail => {
            detailsUl.innerHTML += `<li>${detail}</li>`;
        });

        document.getElementById('m-lex-tokens').textContent = report.nlp_preprocessing.sample_tokens.length;
        document.getElementById('m-lex-chars').textContent = report.nlp_preprocessing.original_length;
        document.getElementById('m-ai-generated-est').textContent = `${fraud.ai_probability}%`;

        // Modal Tab 3: Skill chips and interview questions
        const chipsBox = document.getElementById('modal-skills-chips-box');
        chipsBox.innerHTML = '';
        for (const [cat, matchArray] of Object.entries(report.matched_skills)) {
            const missArray = report.missing_skills[cat] || [];
            if (matchArray.length === 0 && missArray.length === 0) continue;

            let chips = '';
            matchArray.forEach(s => chips += `<span class="skill-chip match">${s.toUpperCase()}</span>`);
            missArray.forEach(s => chips += `<span class="skill-chip missing">${s.toUpperCase()}</span>`);

            chipsBox.innerHTML += `
                <div class="inventory-category-row">
                    <h5>${cat.replace('_', ' ').toUpperCase()}</h5>
                    <div class="inventory-chips">${chips}</div>
                </div>
            `;
        }

        const qBox = document.getElementById('modal-interview-questions-box');
        qBox.innerHTML = '';
        report.interview_questions.forEach(q => {
            qBox.innerHTML += `
                <div class="question-item">
                    <h6>${q.type} - ${q.skill}</h6>
                    <p>${q.question}</p>
                </div>
            `;
        });

        // Recruiter notes
        document.getElementById('modal-recruiter-notes').value = report.recruiter_notes;

        // Recruiter Application Status changer
        document.getElementById('modal-status-select').value = report.status;

        // Open Modal overlay
        modal.classList.add('show');
        switchModalTab('verif');
    });
}

function switchModalTab(tabName) {
    const paneVerif = document.getElementById('modal-tab-verif');
    const paneFraud = document.getElementById('modal-tab-fraud');
    const paneSkills = document.getElementById('modal-tab-skills');

    const btnVerif = document.getElementById('btn-modal-tab-verif');
    const btnFraud = document.getElementById('btn-modal-tab-fraud');
    const btnSkills = document.getElementById('btn-modal-tab-skills');

    // Remove active styles
    [paneVerif, paneFraud, paneSkills].forEach(pane => pane.style.display = 'none');
    [btnVerif, btnFraud, btnSkills].forEach(btn => btn.classList.remove('active'));

    if (tabName === 'verif') {
        paneVerif.style.display = 'block';
        btnVerif.classList.add('active');
    } else if (tabName === 'fraud') {
        paneFraud.style.display = 'block';
        btnFraud.classList.add('active');
    } else {
        paneSkills.style.display = 'block';
        btnSkills.classList.add('active');
    }
}

function closeCandidateModal() {
    document.getElementById('candidate-detail-modal').classList.remove('show');
    ACTIVE_MODAL_APP_ID = null;
    
    // Refresh background database to capture updates
    loadRecruiterCandidates();
}

function changeCandidateStatus() {
    if (!ACTIVE_MODAL_APP_ID) return;
    const newStatus = document.getElementById('modal-status-select').value;

    fetch(`${API_BASE_URL}/api/applications/${ACTIVE_MODAL_APP_ID}/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JWT_TOKEN}`
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Application screening status changed successfully.');
        }
    })
    .catch(err => showToast(err.message, 'error'));
}

function saveRecruiterNotes() {
    if (!ACTIVE_MODAL_APP_ID) return;
    const notesTxt = document.getElementById('modal-recruiter-notes').value.trim();

    fetch(`${API_BASE_URL}/api/applications/${ACTIVE_MODAL_APP_ID}/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JWT_TOKEN}`
        },
        body: JSON.stringify({ notes: notesTxt })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Recruiter notes saved successfully.');
        }
    })
    .catch(err => showToast(err.message, 'error'));
}

function printCandidateReport() {
    window.print();
}

// ==========================================================================
// 8. System Access Security Logs & Dark Mode
// ==========================================================================

function loadAuditLogs() {
    fetch(`${API_BASE_URL}/api/audit-logs`, {
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
    })
    .then(res => res.json())
    .then(logs => {
        const tbody = document.getElementById('audit-logs-tbody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No audit logs registered yet.</td></tr>';
            return;
        }

        logs.forEach(log => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${log.id}</strong></td>
                    <td>${log.username}</td>
                    <td>${log.action}</td>
                    <td><code style="color: var(--color-indigo);">${log.ip_address}</code></td>
                    <td><span style="font-size: 0.8rem; color: var(--text-muted);">${log.timestamp}</span></td>
                </tr>
            `;
        });
    });
}

function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    
    // Set theme variable on load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        btn.innerHTML = '<i class="fa-solid fa-sun" style="color: var(--color-gold)"></i>';
    }

    btn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        
        if (isLight) {
            btn.innerHTML = '<i class="fa-solid fa-sun" style="color: var(--color-gold)"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('theme', 'dark');
        }
    });
}

// Toast System
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    // Set colors
    if (type === 'error') {
        toast.style.borderColor = 'var(--color-red)';
        toast.style.boxShadow = '0 10px 25px rgba(255, 94, 98, 0.2)';
    } else if (type === 'warning') {
        toast.style.borderColor = 'var(--color-gold)';
        toast.style.boxShadow = '0 10px 25px rgba(250, 217, 97, 0.2)';
    } else {
        toast.style.borderColor = 'var(--color-cyan)';
        toast.style.boxShadow = '0 10px 25px rgba(0, 242, 254, 0.15)';
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
