import os
import re
import math
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# ==========================================================================
# 1. Skill Database & NLP Definitions
# ==========================================================================

SKILL_DATABASE = {
    "languages": {
        "python": ["python", "py"],
        "r": [" r ", "r language", "r-programming"],
        "sql": ["sql", "mysql", "postgresql", "sqlite", "nosql", "mongodb"],
        "c++": ["c++", "cpp"],
        "julia": ["julia"],
        "scala": ["scala"],
        "java": ["java"]
    },
    "math_stats": {
        "probability": ["probability", "bayes", "bayesian", "conditional probability"],
        "statistics": ["statistics", "hypothesis testing", "p-value", "anova", "distributions"],
        "linear_algebra": ["linear algebra", "matrix", "matrices", "eigenvalue", "eigenvector", "svd"],
        "calculus": ["calculus", "gradient", "partial derivatives", "chain rule", "optimization"],
        "regression": ["regression", "linear regression", "logistic regression", "multivariate"]
    },
    "ml_core": {
        "scikit-learn": ["scikit-learn", "sklearn"],
        "supervised_learning": ["supervised learning", "classification", "svm", "support vector machine", "random forest", "decision tree", "xgboost", "gradient boosting", "knn", "naive bayes"],
        "unsupervised_learning": ["unsupervised learning", "clustering", "k-means", "knn clustering", "pca", "dimensionality reduction", "dbscan"],
        "feature_engineering": ["feature engineering", "feature selection", "imputation", "scaling", "normalization"],
        "cross_validation": ["cross validation", "k-fold", "hyperparameter tuning", "grid search", "random search", "overfitting", "regularization", "l1/l2", "lasso", "ridge"],
        "evaluation_metrics": ["accuracy", "precision", "recall", "f1-score", "auc-roc", "mse", "mae", "confusion matrix"]
    },
    "deep_learning": {
        "pytorch": ["pytorch", "torch"],
        "tensorflow": ["tensorflow", "tf"],
        "keras": ["keras"],
        "neural_networks": ["neural network", "neural networks", "ann", "mlp", "backpropagation"],
        "cnn": ["cnn", "convolutional neural network", "computer vision", "opencv", "image classification", "object detection", "yolo", "resnet"],
        "rnn_lstm": ["rnn", "lstm", "recurrent neural network", "gru"],
        "transformers": ["transformer", "transformers", "bert", "gpt", "llm", "large language model", "attention mechanism", "huggingface", "nlp", "natural language processing", "word2vec", "embeddings", "tokenization"]
    },
    "mlops_tools": {
        "git": ["git", "github", "gitlab", "version control"],
        "docker": ["docker", "containerization"],
        "kubernetes": ["kubernetes", "k8s"],
        "aws": ["aws", "s3", "ec2", "sagemaker"],
        "gcp": ["gcp", "google cloud", "vertex ai"],
        "azure": ["azure", "ml studio"],
        "mlflow": ["mlflow"],
        "dvc": ["dvc", "data version control"],
        "ci_cd": ["ci/cd", "github actions", "jenkins"],
        "linux": ["linux", "bash", "shell command", "terminal"],
        "airflow": ["airflow", "dag"],
        "fastapi": ["fastapi", "flask", "api deployment"]
    }
}

STOP_WORDS = set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "did", "do",
    "does", "doing", "for", "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "me", "more", "most",
    "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "our", "ours",
    "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such", "than", "that", "the",
    "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through",
    "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
    "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
])

def clean_and_tokenize(text):
    text = text.lower()
    text = re.sub(r'\S+@\S+', '', text)  # remove emails
    text = re.sub(r'http\S+|www\S+', '', text)  # remove links
    text = re.sub(r'[^a-zA-Z0-9\s+-]', ' ', text)  # replace special chars with space
    tokens = text.split()
    cleaned_tokens = [t for t in tokens if t not in STOP_WORDS and (len(t) > 1 or t in ['r', 'c'])]
    return cleaned_tokens

# ==========================================================================
# 2. Pure Python TF-IDF Vectorizer
# ==========================================================================

class PureTfidfVectorizer:
    def __init__(self, min_df=1):
        self.min_df = min_df
        self.vocabulary_ = {}
        self.idf_ = {}
        self.feature_names_ = []

    def fit(self, raw_documents):
        # Calculate Document Frequency (DF)
        df_counts = {}
        total_docs = len(raw_documents)
        
        # Tokenize documents
        tokenized_docs = [clean_and_tokenize(doc) for doc in raw_documents]
        
        for doc in tokenized_docs:
            seen_terms = set(doc)
            for term in seen_terms:
                df_counts[term] = df_counts.get(term, 0) + 1
        
        # Build Vocabulary & IDF
        vocab_idx = 0
        for term, df in df_counts.items():
            if df >= self.min_df:
                self.vocabulary_[term] = vocab_idx
                # Calculate IDF (standard smooth formula)
                self.idf_[term] = math.log((1 + total_docs) / (1 + df)) + 1
                vocab_idx += 1
                
        # Sorted feature names
        self.feature_names_ = [None] * len(self.vocabulary_)
        for term, idx in self.vocabulary_.items():
            self.feature_names_[idx] = term
            
        return self

    def transform(self, raw_documents):
        # Outputs a list of list representation (sparse matrix equivalent)
        vectors = []
        for doc in raw_documents:
            tokens = clean_and_tokenize(doc)
            # Count term frequencies in this document
            tf_counts = {}
            for token in tokens:
                if token in self.vocabulary_:
                    tf_counts[token] = tf_counts.get(token, 0) + 1
            
            # Create the vector
            vector = [0.0] * len(self.vocabulary_)
            for term, count in tf_counts.items():
                idx = self.vocabulary_[term]
                # Log-scaled term frequency
                tf_val = 1.0 + math.log(count)
                # TF-IDF
                vector[idx] = tf_val * self.idf_[term]
                
            # L2 Normalization
            sq_sum = sum(val ** 2 for val in vector)
            if sq_sum > 0:
                l2_norm = math.sqrt(sq_sum)
                vector = [val / l2_norm for val in vector]
                
            vectors.append(vector)
        return vectors

    def get_feature_names_out(self):
        return self.feature_names_

# Cosine similarity helper
def calculate_cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    return dot_product

# ==========================================================================
# 3. Pure Python Machine Learning Models
# ==========================================================================

class PureLogisticRegression:
    """
    Multiclass Logistic Regression (One-vs-Rest / Softmax approach) in pure Python.
    """
    def __init__(self, learning_rate=0.1, epochs=150):
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.weights = None  # shape: (n_classes, n_features)
        self.bias = None     # shape: (n_classes,)

    def fit(self, X, y):
        n_samples = len(X)
        n_features = len(X[0])
        n_classes = len(set(y))
        
        # Initialize parameters
        self.weights = [[0.0] * n_features for _ in range(n_classes)]
        self.bias = [0.0] * n_classes
        
        # Labeled target class one-hot encoding
        y_onehot = []
        for label in y:
            onehot = [0.0] * n_classes
            onehot[label] = 1.0
            y_onehot.append(onehot)
            
        # Gradient Descent Loop
        for _ in range(self.epochs):
            for i in range(n_samples):
                xi = X[i]
                yi = y_onehot[i]
                
                # Compute linear scoring z = x.w + b
                z = []
                for c in range(n_classes):
                    score = sum(xi[j] * self.weights[c][j] for j in range(n_features)) + self.bias[c]
                    z.append(score)
                
                # Softmax probabilities
                max_z = max(z)  # numerical stability trick
                exp_z = [math.exp(val - max_z) for val in z]
                sum_exp_z = sum(exp_z)
                probs = [val / sum_exp_z for val in exp_z]
                
                # Gradient update for each class weights & bias
                for c in range(n_classes):
                    err = probs[c] - yi[c]
                    # Update weights and bias
                    for j in range(n_features):
                        self.weights[c][j] -= self.learning_rate * err * xi[j]
                    self.bias[c] -= self.learning_rate * err

    def predict_proba(self, X):
        probs_all = []
        for x in X:
            z = []
            for c in range(len(self.weights)):
                score = sum(x[j] * self.weights[c][j] for j in range(len(x))) + self.bias[c]
                z.append(score)
            max_z = max(z)
            exp_z = [math.exp(val - max_z) for val in z]
            sum_exp_z = sum(exp_z)
            probs = [val / sum_exp_z for val in exp_z]
            probs_all.append(probs)
        return probs_all

    def predict(self, X):
        probs = self.predict_proba(X)
        predictions = []
        for p in probs:
            max_idx = p.index(max(p))
            predictions.append(max_idx)
        return predictions


class PureDecisionTree:
    """
    Classification Decision Tree built in pure Python.
    """
    class Node:
        def __init__(self, feature=None, threshold=None, left=None, right=None, value=None):
            self.feature = feature       # Index of split feature
            self.threshold = threshold   # Value of split threshold
            self.left = left             # Left sub-tree
            self.right = right           # Right sub-tree
            self.value = value           # Predict class distribution if leaf
            
        def is_leaf(self):
            return self.value is not None

    def __init__(self, max_depth=4):
        self.max_depth = max_depth
        self.root = None

    def _gini(self, y):
        if not y: return 0
        counts = {}
        for val in y:
            counts[val] = counts.get(val, 0) + 1
        m = len(y)
        return 1.0 - sum((count / m) ** 2 for count in counts.values())

    def _split(self, X, y, idx, threshold):
        left_X, left_y = [], []
        right_X, right_y = [], []
        for i, val in enumerate(X):
            if val[idx] <= threshold:
                left_X.append(val)
                left_y.append(y[i])
            else:
                right_X.append(val)
                right_y.append(y[i])
        return left_X, left_y, right_X, right_y

    def _best_split(self, X, y, feature_indices):
        best_gini = 999.0
        best_feat = None
        best_thresh = None
        
        n_features = len(X[0])
        
        for feat in feature_indices:
            # Gather unique values for this feature to try as thresholds
            feat_values = list(set(x[feat] for x in X))
            for thresh in feat_values:
                # Split dataset
                _, ly, _, ry = self._split(X, y, feat, thresh)
                if not ly or not ry:
                    continue
                # Calculate weighted impurity
                n = len(y)
                gini_split = (len(ly)/n) * self._gini(ly) + (len(ry)/n) * self._gini(ry)
                
                if gini_split < best_gini:
                    best_gini = gini_split
                    best_feat = feat
                    best_thresh = thresh
                    
        return best_feat, best_thresh

    def _build_tree(self, X, y, depth=0, feature_sample_count=None):
        n_samples = len(X)
        n_features = len(X[0]) if n_samples > 0 else 0
        n_classes = len(set(y))
        
        # Calculate majority class frequencies for leaf nodes
        class_counts = {}
        for val in y:
            class_counts[val] = class_counts.get(val, 0) + 1
        
        # If homogenous, or max depth, or too few samples: make leaf
        if n_classes == 1 or depth >= self.max_depth or n_samples < 2:
            probs = [0.0] * 3  # Assume 3 classes (0: Poor, 1: Moderate, 2: High)
            for c, count in class_counts.items():
                if 0 <= c < 3:
                    probs[c] = count / n_samples
            return self.Node(value=probs)
            
        # Draw features to evaluate
        all_features = list(range(n_features))
        if feature_sample_count and feature_sample_count < n_features:
            features = random.sample(all_features, feature_sample_count)
        else:
            features = all_features
            
        best_feat, best_thresh = self._best_split(X, y, features)
        
        if best_feat is None:
            # Fallback to leaf
            probs = [0.0] * 3
            for c, count in class_counts.items():
                if 0 <= c < 3:
                    probs[c] = count / n_samples
            return self.Node(value=probs)
            
        # Build children
        l_X, l_y, r_X, r_y = self._split(X, y, best_feat, best_thresh)
        left = self._build_tree(l_X, l_y, depth + 1, feature_sample_count)
        right = self._build_tree(r_X, r_y, depth + 1, feature_sample_count)
        
        return self.Node(feature=best_feat, threshold=best_thresh, left=left, right=right)

    def fit(self, X, y, feature_sample_count=None):
        self.root = self._build_tree(X, y, 0, feature_sample_count)
        return self

    def _predict_val(self, node, x):
        if node.is_leaf():
            return node.value
        if x[node.feature] <= node.threshold:
            return self._predict_val(node.left, x)
        else:
            return self._predict_val(node.right, x)

    def predict_proba(self, X):
        return [self._predict_val(self.root, x) for x in X]

    def predict(self, X):
        probs = self.predict_proba(X)
        return [p.index(max(p)) for p in probs]


class PureRandomForest:
    """
    Ensemble Random Forest Classifier in pure Python.
    """
    def __init__(self, n_estimators=7, max_depth=3, max_features_ratio=0.5):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.max_features_ratio = max_features_ratio
        self.trees = []

    def fit(self, X, y):
        self.trees = []
        n_samples = len(X)
        n_features = len(X[0])
        feature_sample_count = int(n_features * self.max_features_ratio)
        
        # Seed random state to have repeatable bootstrap draws
        random.seed(42)
        
        for _ in range(self.n_estimators):
            # Bootstrap sample (draw samples with replacement)
            bootstrap_indices = [random.randint(0, n_samples - 1) for _ in range(n_samples)]
            b_X = [X[idx] for idx in bootstrap_indices]
            b_y = [y[idx] for idx in bootstrap_indices]
            
            tree = PureDecisionTree(max_depth=self.max_depth)
            tree.fit(b_X, b_y, feature_sample_count=feature_sample_count)
            self.trees.append(tree)
            
        return self

    def predict_proba(self, X):
        all_tree_probs = [tree.predict_proba(X) for tree in self.trees]
        # Average probability distributions across trees
        avg_probs = []
        n_samples = len(X)
        for i in range(n_samples):
            avg_p = [0.0] * 3
            for tree_idx in range(self.n_estimators):
                p = all_tree_probs[tree_idx][i]
                for c in range(3):
                    avg_p[c] += p[c]
            avg_p = [val / self.n_estimators for val in avg_p]
            avg_probs.append(avg_p)
        return avg_probs

    def predict(self, X):
        probs = self.predict_proba(X)
        return [p.index(max(p)) for p in probs]

    def get_feature_importances(self, n_features):
        """
        Approximate feature importances by counting splits in our trees.
        """
        importances = [0.0] * n_features
        
        def traverse(node, depth):
            if node.is_leaf():
                return
            # Add weight inversely proportional to split depth
            weight = 1.0 / (depth + 1)
            importances[node.feature] += weight
            traverse(node.left, depth + 1)
            traverse(node.right, depth + 1)
            
        for tree in self.trees:
            if tree.root:
                traverse(tree.root, 0)
                
        # Normalize weights to sum to 1.0
        total = sum(importances)
        if total > 0:
            importances = [val / total for val in importances]
        return importances

# ==========================================================================
# 4. Pipeline Execution Logic & Dataset Setup
# ==========================================================================

def extract_skills_from_text(text):
    text_lower = " " + text.lower() + " "
    found_skills = {}
    
    for category, skills in SKILL_DATABASE.items():
        found_skills[category] = []
        for skill_name, aliases in skills.items():
            for alias in aliases:
                pattern = r'\b' + re.escape(alias) + r'\b' if len(alias.strip()) > 1 else re.escape(alias)
                if re.search(pattern, text_lower):
                    found_skills[category].append(skill_name)
                    break
    return found_skills

def generate_recommendations(missing_skills, target_role):
    recommendations = []
    templates = {
        "languages": {
            "title": "Master Core Programming",
            "desc": "Strengthen coding capabilities in: {skills}.",
            "action": "Course Suggestion: 'Python for Data Science' (Coursera) or 'SQL Bootcamp' (Udemy). Build a small web scraper or database CRUD application."
        },
        "math_stats": {
            "title": "Solidify Mathematical Foundations",
            "desc": "ML pipelines depend on probability distributions, matrices, and tests. Focus on: {skills}.",
            "action": "Book Suggestion: 'Introduction to Linear Algebra' by Gilbert Strang, or Khan Academy's College Statistics course."
        },
        "ml_core": {
            "title": "Deepen Classical Machine Learning",
            "desc": "Develop fundamental predictive modeling concepts: {skills}.",
            "action": "Project Suggestion: Train random forests, decision trees, and evaluate models using confusion matrices, precision/recall on Kaggle."
        },
        "deep_learning": {
            "title": "Level up Deep Learning & Frameworks",
            "desc": "Hands-on experience with modern neural network structures is missing: {skills}.",
            "action": "Project Suggestion: Train a custom CNN in PyTorch, or fine-tune a Transformer model (BERT/GPT) using the HuggingFace library."
        },
        "mlops_tools": {
            "title": "Establish MLOps & Deployment Skills",
            "desc": "Required tools for running ML systems in production: {skills}.",
            "action": "Project Suggestion: Package a model using Docker, write an API using FastAPI, and set up a simple GitHub Actions deployment pipeline."
        }
    }
    
    for category, skills in missing_skills.items():
        if skills:
            skills_str = ", ".join([s.replace("_", " ").upper() for s in skills])
            category_template = templates.get(category)
            if category_template:
                recommendations.append({
                    "category": category.replace("_", " ").title(),
                    "title": category_template["title"],
                    "description": category_template["desc"].format(skills=skills_str),
                    "action": category_template["action"]
                })
                
    if not recommendations:
        recommendations.append({
            "category": "General",
            "title": "Exceptional Project Match!",
            "description": "Your current resume satisfies all technical skill requirements.",
            "action": "Action: Practice explaining structural ML trade-offs and focus on highlighting quantified business impacts (e.g., metric enhancements) in your resume."
        })
        
    return recommendations

def create_synthetic_dataset(job_skills):
    # Flatten job skills
    flat_job_skills = []
    for cat, skills in job_skills.items():
        flat_job_skills.extend(skills)
    
    if not flat_job_skills:
        flat_job_skills = ["python", "machine learning", "statistics", "scikit-learn"]

    dataset = []
    labels = []

    highly_suitable_templates = [
        "Machine Learning Engineer with expertise in {skills_str}. Experienced in building, training, and deploying supervised and unsupervised models. Developed deep learning models using PyTorch and TensorFlow, optimizing inference performance. Implemented ML pipelines and set up CI/CD with Docker and Git. Strong foundation in linear algebra and statistics, validating model performance using precision, recall, and cross-validation.",
        "Senior Data Scientist specializing in {skills_str}. Proven track record of applying machine learning algorithms like Random Forest, XGBoost, and Decision Trees. Managed complete data lifecycle from feature engineering to production deployment on AWS. Leveraged linear algebra and probability for statistical hypothesis testing, driving business metrics by 25%. Deployed microservices using Docker and FastAPI.",
        "AI Research Scientist with hands-on experience in {skills_str}. Focused on deep learning architectures, Transformers, and computer vision pipelines (CNN, OpenCV). Published papers on model optimization and gradient descent algorithms. Proficient coder in Python, C++, and SQL databases.",
        "MLOps Engineer bridging the gap between ML models and infrastructure. Expertise in {skills_str}. Built automated model retraining pipelines using MLflow, DVC, and Airflow. Deployed scalable models on Kubernetes and AWS SageMaker. Highly skilled in version control (Git) and containerization."
    ]
    
    for i in range(10):
        # Sample half of job skills
        sampled_skills = list(flat_job_skills)
        if len(flat_job_skills) > 3:
            random.seed(i)
            sampled_skills = random.sample(flat_job_skills, k=max(2, len(flat_job_skills) // 2 + 1))
        skills_str = ", ".join([s.replace("_", " ") for s in sampled_skills])
        template = highly_suitable_templates[i % len(highly_suitable_templates)]
        dataset.append(template.format(skills_str=skills_str) + " Successfully built scalable production systems.")
        labels.append(2) # Highly Suitable
        
    moderately_suitable_templates = [
        "Software Engineer with interest in machine learning. Proficient in Python and Java, with basic exposure to {skills_str}. Familiar with pandas, numpy, and building linear regression or decision tree models in Scikit-Learn. Looking to expand skills into deep learning and MLOps.",
        "Data Analyst with 3 years of experience. Experienced in SQL, Excel, and data visualization. Knowledgeable in Python, basic statistics, probability, and standard algorithms. Completed online coursework on {skills_str} and built academic projects using random forest models.",
        "Full Stack Developer transitioning to AI. Strong backend engineering skills (FastAPI, SQL, Docker). Basic knowledge of Python and machine learning pipelines, including {skills_str}. Lacks heavy production ML deployment experience or advanced mathematical theory.",
        "Junior Analyst with a background in mathematics and statistics. Skilled in R programming, hypothesis testing, and regression analysis. Recently learning Python and {skills_str} tools to build predictive models."
    ]
    
    for i in range(10):
        sampled_skills = list(flat_job_skills)
        if len(flat_job_skills) > 2:
            random.seed(i + 10)
            sampled_skills = random.sample(flat_job_skills, k=max(1, len(flat_job_skills) // 3))
        skills_str = ", ".join([s.replace("_", " ") for s in sampled_skills])
        template = moderately_suitable_templates[i % len(moderately_suitable_templates)]
        dataset.append(template.format(skills_str=skills_str))
        labels.append(1) # Moderately Suitable
        
    not_suitable_templates = [
        "Experienced Web Developer specializing in HTML, CSS, JavaScript, React, and Node.js. Built fully responsive e-commerce websites and managed frontend state using Redux. Proficient in UI layouts and client communication.",
        "Graphic Designer and UI/UX Specialist. Expert in Adobe Creative Suite (Photoshop, Illustrator, Figma). Created marketing campaigns, brand identity designs, and high-fidelity mobile prototypes.",
        "Sales Associate and Account Manager. Focus on B2B lead generation, customer relationship management, sales funnels, and CRM platforms (Salesforce). Strong verbal communication and negotiation skills.",
        "Administrative Assistant with extensive background in office coordination, scheduling meetings, managing documentation, data entry, and Microsoft Office Suite (Word, Excel, PowerPoint)."
    ]
    
    for i in range(10):
        template = not_suitable_templates[i % len(not_suitable_templates)]
        dataset.append(template)
        labels.append(0) # Not Suitable
        
    return dataset, labels

# ==========================================================================
# 5. REST API Endpoints
# ==========================================================================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400
        
    resume_text = data.get("resume_text", "")
    job_description = data.get("job_description", "")
    target_role = data.get("target_role", "Machine Learning Engineer")
    
    if not resume_text.strip():
        return jsonify({"error": "Resume text is empty"}), 400
    if not job_description.strip():
        return jsonify({"error": "Job description is empty"}), 400
        
    # 1. NLP Preprocessing Phase
    resume_tokens = clean_and_tokenize(resume_text)
    job_tokens = clean_and_tokenize(job_description)
    
    cleaned_resume = " ".join(resume_tokens)
    cleaned_job = " ".join(job_tokens)
    
    # 2. Skill Extraction & Gap Analysis
    resume_skills = extract_skills_from_text(resume_text)
    job_skills = extract_skills_from_text(job_description)
    
    matched_skills = {}
    missing_skills = {}
    skill_scores = {}
    
    total_required = 0
    total_matched = 0
    
    for category in SKILL_DATABASE.keys():
        req = job_skills.get(category, [])
        cand = resume_skills.get(category, [])
        
        match = list(set(req).intersection(cand))
        miss = list(set(req).difference(cand))
        
        matched_skills[category] = match
        missing_skills[category] = miss
        
        total_required += len(req)
        total_matched += len(match)
        
        if len(req) > 0:
            skill_scores[category] = int((len(match) / len(req)) * 100)
        else:
            skill_scores[category] = 100 if len(cand) > 0 else 100
            
    overall_skill_match_percentage = int((total_matched / total_required) * 100) if total_required > 0 else 50
    overall_skill_match_percentage = min(100, max(0, overall_skill_match_percentage))
    
    # 3. TF-IDF & Cosine Similarity using Pure Python Vectorizer
    # Fit on all documents (train + candidate)
    train_texts, train_labels = create_synthetic_dataset(job_skills)
    corpus = [cleaned_resume, cleaned_job] + train_texts
    
    vectorizer = PureTfidfVectorizer(min_df=1)
    vectorizer.fit(corpus)
    
    # Transform Resume and Job Description
    vectors = vectorizer.transform([cleaned_resume, cleaned_job])
    v_resume = vectors[0]
    v_job = vectors[1]
    
    similarity_score = calculate_cosine_similarity(v_resume, v_job)
    similarity_percentage = int(similarity_score * 100)
    similarity_percentage = min(100, max(0, similarity_percentage))
    
    # Extract top keywords by TF-IDF weight for both texts
    feature_names = vectorizer.get_feature_names_out()
    
    resume_top_indices = sorted(range(len(v_resume)), key=lambda i: v_resume[i], reverse=True)[:10]
    job_top_indices = sorted(range(len(v_job)), key=lambda i: v_job[i], reverse=True)[:10]
    
    resume_top_keywords = [
        {"word": str(feature_names[i]), "weight": float(v_resume[i])}
        for i in resume_top_indices if v_resume[i] > 0
    ]
    
    job_top_keywords = [
        {"word": str(feature_names[i]), "weight": float(v_job[i])}
        for i in job_top_indices if v_job[i] > 0
    ]
    
    # 4. Train Pure Python Classifiers on-the-fly and Predict Suitability
    # Transform training texts
    X_train = vectorizer.transform(train_texts)
    y_train = train_labels
    
    # Transform candidate resume
    X_candidate = [v_resume]
    
    # Model 1: Pure Logistic Regression
    lr = PureLogisticRegression(learning_rate=0.15, epochs=200)
    lr.fit(X_train, y_train)
    lr_pred_class = lr.predict(X_candidate)[0]
    lr_probs = lr.predict_proba(X_candidate)[0]
    
    # Model 2: Pure Decision Tree Classifier
    dt = PureDecisionTree(max_depth=4)
    dt.fit(X_train, y_train)
    dt_pred_class = dt.predict(X_candidate)[0]
    dt_probs = dt.predict_proba(X_candidate)[0]
    
    # Model 3: Pure Random Forest Classifier
    rf = PureRandomForest(n_estimators=11, max_depth=4)
    rf.fit(X_train, y_train)
    rf_pred_class = rf.predict(X_candidate)[0]
    rf_probs = rf.predict_proba(X_candidate)[0]
    
    # Map predictions to labels
    class_map = {0: "Not Suitable", 1: "Moderately Suitable", 2: "Highly Suitable"}
    
    # ATS formatting check list (simulated parser logic)
    ats_checks = {
        "has_contact": bool(re.search(r'\b[\w\.-]+@[\w\.-]+\.\w{2,}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', resume_text)),
        "has_education": bool(re.search(r'\beducation\b|\bdegree\b|\buniversity\b|\bcollege\b|\bbs\b|\bms\b|\bphd\b', resume_text.lower())),
        "has_experience": bool(re.search(r'\bexperience\b|\bwork history\b|\bemployment\b|\bposition\b|\bjob\b', resume_text.lower())),
        "has_projects": bool(re.search(r'\bprojects\b|\bportfolio\b|\bpersonal projects\b|\bgithub\b', resume_text.lower())),
        "quantified_impact": len(re.findall(r'\b\d+%\b|\b\d+\s*(?:percent|million|k|usd|gb|mb|accuracy|improvement|reduced)\b', resume_text.lower())) >= 1
    }
    
    ats_score = int(sum(ats_checks.values()) / len(ats_checks) * 100)
    
    # Aggregate Overall Score (weighted average of Cosine Similarity, Skill Match, and Random Forest classification probability)
    suitability_prob = rf_probs[2] * 100
    
    overall_score = int((similarity_percentage * 0.3) + (overall_skill_match_percentage * 0.4) + (suitability_prob * 0.2) + (ats_score * 0.1))
    overall_score = min(100, max(0, overall_score))
    
    # Generate recommendations
    recommendations = generate_recommendations(missing_skills, target_role)
    
    # Feature Importance for Random Forest
    importances = rf.get_feature_importances(len(v_resume))
    top_imp_indices = sorted(range(len(importances)), key=lambda i: importances[i], reverse=True)[:6]
    feature_importances = [
        {"feature": str(feature_names[i]), "importance": float(importances[i])}
        for i in top_imp_indices if importances[i] > 0
    ]
    
    # Return complete report
    return jsonify({
        "status": "success",
        "metadata": {
            "target_role": target_role,
            "overall_score": overall_score,
            "cosine_similarity": similarity_percentage,
            "skill_match_score": overall_skill_match_percentage,
            "ats_score": ats_score
        },
        "nlp_preprocessing": {
            "original_length": len(resume_text),
            "cleaned_length": len(cleaned_resume),
            "sample_tokens": resume_tokens[:40]
        },
        "tfidf_analysis": {
            "resume_top_keywords": resume_top_keywords,
            "job_top_keywords": job_top_keywords
        },
        "classifiers": {
            "logistic_regression": {
                "prediction": class_map[lr_pred_class],
                "probabilities": {
                    "not_suitable": float(lr_probs[0]),
                    "moderately_suitable": float(lr_probs[1]),
                    "highly_suitable": float(lr_probs[2])
                }
            },
            "decision_tree": {
                "prediction": class_map[dt_pred_class],
                "probabilities": {
                    "not_suitable": float(dt_probs[0]),
                    "moderately_suitable": float(dt_probs[1]),
                    "highly_suitable": float(dt_probs[2])
                }
            },
            "random_forest": {
                "prediction": class_map[rf_pred_class],
                "probabilities": {
                    "not_suitable": float(rf_probs[0]),
                    "moderately_suitable": float(rf_probs[1]),
                    "highly_suitable": float(rf_probs[2])
                },
                "feature_importances": feature_importances
            }
        },
        "skill_gap_analysis": {
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "category_scores": skill_scores
        },
        "ats_compatibility": {
            "checks": ats_checks,
            "score": ats_score
        },
        "recommendations": recommendations
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
