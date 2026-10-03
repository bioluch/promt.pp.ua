/**
 * python_core.js — JS PROMPT PWA
 * 
 * Enterprise-grade prompt generation system with:
 * - Multi-layer domain classification
 * - Expert role management  
 * - Domain-specific methodologies
 * - Confidence assessment framework
 * - Anti-hallucination controls
 * - Quality assurance system
 * - Information requirements framework
 * - Bias control framework
 * - Red team methodology
 * - Research objective definition
 */

const PYTHON_CORE = `
import io, re, os, json
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any

# ============================================================================
# BASE UTILITIES
# ============================================================================

_BT = chr(96)

def _safe_re_sub(pattern, repl, text, count=0, flags=0):
    try:
        return re.sub(pattern, repl, text, count=count, flags=flags)
    except (UnicodeDecodeError, UnicodeEncodeError, re.error):
        return text

def _safe_re_match(pattern, text):
    try:
        return re.match(pattern, text)
    except (UnicodeDecodeError, UnicodeEncodeError, re.error):
        return None

def _safe_re_findall(pattern, text):
    try:
        return re.findall(pattern, text)
    except (UnicodeDecodeError, UnicodeEncodeError, re.error):
        return []

def _safe_list_match(text, pattern):
    try:
        return bool(pattern.match(text))
    except Exception:
        return False

def _safe_list_sub(text, pattern):
    try:
        return pattern.sub('', text)
    except Exception:
        return text

def _clean_text(text):
    try:
        text = text.replace('\\u2018', "'").replace('\\u2019', "'")
        text = text.replace('\\u201c', '"').replace('\\u201d', '"')
        text = text.replace('\\u2013', '-').replace('\\u2014', '--')
        return ''.join(c for c in text if ord(c) >= 32 or ord(c) in (9, 10, 13)).strip()
    except Exception:
        return text

def _strip_emoji(text):
    try:
        pat = re.compile(
            u'[\\U0001F300-\\U0001FFFF'
            u'\\U00002600-\\U000027BF'
            u'\\U0000FE00-\\U0000FE0F'
            u'\\U00002700-\\U000027BF]+',
            flags=re.UNICODE)
        return pat.sub('', text)
    except Exception:
        return text

def _detect_language(text):
    try:
        cyr = len(_safe_re_findall(r'[а-яіїєґА-ЯІЇЄҐ]', text))
        lat = len(_safe_re_findall(r'[a-zA-Z]', text))
        return 'uk' if cyr >= lat else 'en'
    except Exception:
        return 'en'

# ============================================================================
# CONFIDENCE ASSESSMENT FRAMEWORK
# ============================================================================

class ConfidenceLevel:
    HIGH = "High Confidence"
    MODERATE = "Moderate Confidence" 
    LOW = "Low Confidence"

class ConfidenceAssessor:
    """Assesses confidence levels based on evidence quality and source reliability."""
    
    @staticmethod
    def assess(domain: str, context: Dict) -> Dict:
        """Return confidence assessment with rationale."""
        assessments = {
            'intelligence_analysis': ConfidenceAssessor._assess_intelligence,
            'osint': ConfidenceAssessor._assess_osint,
            'strategic_risk': ConfidenceAssessor._assess_strategic_risk,
            'medical_diagnostics': ConfidenceAssessor._assess_medical,
            'cybersecurity': ConfidenceAssessor._assess_cybersecurity,
            'financial_analysis': ConfidenceAssessor._assess_financial,
            'scientific_research': ConfidenceAssessor._assess_research,
        }
        
        assessor = assessments.get(domain, ConfidenceAssessor._assess_general)
        return assessor(context)
    
    @staticmethod
    def _assess_intelligence(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.MODERATE,
            'rationale': 'Intelligence analysis based on open sources, confidence limited by information availability and source verification status.',
            'criteria': [
                'Source verification status required for high confidence',
                'Multiple independent sources increase confidence',
                'Information gaps reduce confidence'
            ]
        }
    
    @staticmethod
    def _assess_osint(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.MODERATE,
            'rationale': 'OSINT relies on open-source information requiring cross-verification for high confidence.',
            'criteria': [
                'Cross-verified sources = Higher confidence',
                'Single source = Lower confidence',
                'Primary source quality impacts confidence'
            ]
        }
    
    @staticmethod
    def _assess_strategic_risk(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.MODERATE,
            'rationale': 'Strategic risk assessment requires probabilistic modeling and scenario analysis.',
            'criteria': [
                'Scenario analysis provides structured uncertainty',
                'Multiple scenarios improve confidence',
                'Historical data increases confidence'
            ]
        }
    
    @staticmethod
    def _assess_medical(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.HIGH,
            'rationale': 'Medical diagnostics follow evidence-based protocols with established guidelines.',
            'criteria': [
                'Follows Evidence-Based Medicine guidelines',
                'Grade A/B/C evidence levels specified',
                'Clinical guidelines provide structured approach'
            ]
        }
    
    @staticmethod
    def _assess_cybersecurity(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.MODERATE,
            'rationale': 'Cybersecurity assessment depends on threat intelligence quality and testing scope.',
            'criteria': [
                'Penetration test scope defines confidence',
                'Threat intelligence quality impacts assessment',
                'Vulnerability severity rating provides confidence'
            ]
        }
    
    @staticmethod
    def _assess_financial(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.MODERATE,
            'rationale': 'Financial analysis depends on data quality, assumptions, and model reliability.',
            'criteria': [
                'Data quality impacts confidence',
                'Model assumptions explicitly stated',
                'Sensitivity analysis shows confidence ranges'
            ]
        }
    
    @staticmethod
    def _assess_research(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.HIGH,
            'rationale': 'Scientific research follows systematic methodology with peer-reviewed standards.',
            'criteria': [
                'Research methodology defined',
                'Evidence quality assessed',
                'Peer-reviewed sources increase confidence'
            ]
        }
    
    @staticmethod
    def _assess_general(context: Dict) -> Dict:
        return {
            'level': ConfidenceLevel.MODERATE,
            'rationale': 'General assessment based on available information with standard quality controls.',
            'criteria': [
                'Information quality impacts confidence',
                'Clear reasoning supports conclusions',
                'Uncertainties explicitly stated'
            ]
        }

# ============================================================================
# ANTI-HALLUCINATION FRAMEWORK
# ============================================================================

class AntiHallucinationControls:
    """Framework to prevent hallucinations and ensure factual accuracy."""
    
    @staticmethod
    def get_controls(domain: str) -> Dict:
        """Return domain-specific anti-hallucination controls."""
        base_controls = [
            "Do not fabricate facts or invent information",
            "Clearly distinguish facts from assumptions and assessments",
            "Explicitly identify information gaps and missing data",
            "State evidence limitations and information quality issues",
            "Explicitly acknowledge uncertainty where present",
            "Apply confidence levels to all assessments",
            "Provide alternative explanations and competing hypotheses",
            "Avoid unsupported conclusions and speculative statements",
            "Reference sources and evidence when making claims"
        ]
        
        domain_controls = {
            'intelligence_analysis': [
                "Apply ACH (Analysis of Competing Hypotheses) methodology",
                "Identify and challenge key assumptions",
                "Use structured analytic techniques",
                "Assess source reliability and credibility",
                "Generate alternative scenarios",
                "Distinguish between facts, assessments, and forecasts",
                "Document analytical uncertainty explicitly"
            ],
            'medical_diagnostics': [
                "Follow Evidence-Based Medicine guidelines",
                "Specify evidence levels (Grade A/B/C)",
                "Consult clinical guidelines (WHO, CDC, EMA)",
                "Identify red flags requiring immediate attention",
                "Provide differential diagnosis with probability estimates"
            ],
            'cybersecurity': [
                "Apply CVSS vulnerability scoring standards",
                "Document assessment methodology and scope",
                "Use MITRE ATT&CK framework for threat modeling",
                "Verify vulnerability claims before reporting",
                "Provide reproducible evidence for findings"
            ],
            'financial_analysis': [
                "State all model assumptions explicitly",
                "Apply sensitivity analysis to key parameters",
                "Specify valuation methodology (DCF, comparables, etc.)",
                "Identify risks and limitations in analysis",
                "Provide scenario-based ranges (bull/base/bear)"
            ],
            'scientific_research': [
                "Follow research methodology standards",
                "Cite peer-reviewed sources and evidence",
                "Distinguish between hypothesis and established fact",
                "Identify limitations in study design",
                "Provide statistical significance where applicable"
            ]
        }
        
        return {
            'base': base_controls,
            'domain': domain_controls.get(domain, [])
        }
    
    @staticmethod
    def format_controls(domain: str, lang: str) -> str:
        """Format anti-hallucination controls as prompt text."""
        controls = AntiHallucinationControls.get_controls(domain)
        
        uk_template = """
## Анти-галюцинаційний контроль

### Обов'язкові вимоги
{base}

### Галузеві вимоги
{domain}
"""
        en_template = """
## Anti-Hallucination Control

### Mandatory Requirements
{base}

### Domain-Specific Requirements
{domain}
"""
        
        template = uk_template if lang == 'uk' else en_template
        
        base_text = '\\n'.join(f"- {c}" for c in controls['base'])
        domain_text = '\\n'.join(f"- {c}" for c in controls['domain']) if controls['domain'] else "- Apply standard quality controls"
        
        return template.format(base=base_text, domain=domain_text)

# ============================================================================
# BIAS CONTROL FRAMEWORK
# ============================================================================

def _build_bias_controls(domain: str, lang: str) -> str:
    """Generate bias control section for analytical domains."""
    uk = lang == 'uk'
    
    biases = {
        'confirmation_bias': {
            'uk': '''### Confirmation Bias Check
- **Risk**: Tendency to seek information confirming existing beliefs
- **Mitigation**: Actively search for disconfirming evidence; consider alternative hypotheses; challenge assumptions systematically''',
            'en': '''### Confirmation Bias Check
- **Risk**: Tendency to seek information confirming existing beliefs
- **Mitigation**: Actively search for disconfirming evidence; consider alternative hypotheses; challenge assumptions systematically'''
        },
        'anchoring_bias': {
            'uk': '''### Anchoring Bias Check
- **Risk**: Over-reliance on first information received
- **Mitigation**: Consider multiple reference points; use structured analytic techniques; compare with alternative estimates''',
            'en': '''### Anchoring Bias Check
- **Risk**: Over-reliance on first information received
- **Mitigation**: Consider multiple reference points; use structured analytic techniques; compare with alternative estimates'''
        },
        'mirror_imaging': {
            'uk': '''### Mirror Imaging Check
- **Risk**: Assuming others think and act like us
- **Mitigation**: Analyze from adversary perspective; consider cultural and strategic differences; use Red Team analysis''',
            'en': '''### Mirror Imaging Check
- **Risk**: Assuming others think and act like us
- **Mitigation**: Analyze from adversary perspective; consider cultural and strategic differences; use Red Team analysis'''
        },
        'availability_bias': {
            'uk': '''### Availability Bias Check
- **Risk**: Over-weighting recent or memorable information
- **Mitigation**: Systematically collect data over time; consider base rates; use statistical methods''',
            'en': '''### Availability Bias Check
- **Risk**: Over-weighting recent or memorable information
- **Mitigation**: Systematically collect data over time; consider base rates; use statistical methods'''
        },
        'selection_bias': {
            'uk': '''### Selection Bias Check
- **Risk**: Sample not representative of population
- **Mitigation**: Ensure diverse source selection; consider missing data; assess collection methodology''',
            'en': '''### Selection Bias Check
- **Risk**: Sample not representative of population
- **Mitigation**: Ensure diverse source selection; consider missing data; assess collection methodology'''
        },
        'survivorship_bias': {
            'uk': '''### Survivorship Bias Check
- **Risk**: Focusing on successful examples only
- **Mitigation**: Study failures as well as successes; consider selection effects; assess data completeness''',
            'en': '''### Survivorship Bias Check
- **Risk**: Focusing on successful examples only
- **Mitigation**: Study failures as well as successes; consider selection effects; assess data completeness'''
        },
        'recency_bias': {
            'uk': '''### Recency Bias Check
- **Risk**: Over-weighting recent events
- **Mitigation**: Consider historical patterns; use long-term trend analysis; assess cyclical patterns''',
            'en': '''### Recency Bias Check
- **Risk**: Over-weighting recent events
- **Mitigation**: Consider historical patterns; use long-term trend analysis; assess cyclical patterns'''
        }
    }
    
    analytical_domains = ['intelligence_analysis', 'osint', 'strategic_risk', 
                          'scientific_research', 'cybersecurity', 'financial_analysis', 'medical_diagnostics']
    
    if domain not in analytical_domains:
        return ''
    
    bias_list = list(biases.values())
    bias_text = '\\n\\n'.join(b.get('uk' if uk else 'en', b.get('en', '')) for b in bias_list)
    
    template = {
        'uk': f'''## Контроль упереджень

{bias_text}''',
        'en': f'''## Bias Control

{bias_text}'''
    }
    
    return template.get('uk' if uk else 'en', template.get('en', ''))

# ============================================================================
# DOMAIN CLASSIFICATION ENGINE
# ============================================================================

class DomainClassifier:
    """Multi-layer domain classification with priority and confidence scoring."""
    
    DOMAINS = {
        'intelligence_analysis': {
            'keywords': [
                'osint', 'розвідк', 'intelligence', 'геополітик', 'geopolit',
                'стратегічн', 'strategic', 'threat', 'загроза', 'risk assessment',
                'nuclear', 'ядерн', 'military', 'військов', 'conflict', 'конфлікт',
                'sanctions', 'санкції', 'disinformation', 'дезінформ', 'propaganda',
                'пропаганд', 'terrorism', 'тероризм', 'scenario', 'сценарний',
                'war games', 'ескалація', 'escalation', 'crisis', 'кризов'
            ],
            'weight': 5,
            'priority': 1,
            'semantic_markers': ['analysis', 'assessment', 'evaluation', 'forecast']
        },
        'osint': {
            'keywords': [
                'osint', 'open source', 'відкриті джерела', 'розвідк',
                'intelligence', 'analysis', 'аналіз', 'investigation', 'розслідув',
                'social media', 'соціальні медіа', 'geolocation', 'геолокація',
                'verification', 'верифікац', 'source analysis', 'джерела'
            ],
            'weight': 4,
            'priority': 2,
            'semantic_markers': ['investigation', 'verification', 'analysis']
        },
        'strategic_risk': {
            'keywords': [
                'risk', 'ризик', 'стратегічн', 'strategic', 'threat assessment',
                'оцінка загроз', 'risk matrix', 'матриця ризиків', 'scenario planning',
                'сценарне планування', 'crisis management', 'кризовий менеджмент',
                'uncertainty', 'невизначеність', 'strategic planning', 'стратегічне планув'
            ],
            'weight': 4,
            'priority': 3,
            'semantic_markers': ['assessment', 'planning', 'evaluation']
        },
        'medical_diagnostics': {
            'keywords': [
                'медицин', 'медичн', 'діагност', 'diagnosis', 'симптом', 'symptom',
                'пацієнт', 'patient', 'лікуванн', 'treatment', 'терапія', 'therapy',
                'клінічн', 'clinical', 'хвороб', 'disease', 'protocol', 'протокол',
                'дозування', 'dosage', 'мкб', 'icd', 'evidence-based', 'рандомізован',
                'randomized', 'placebo', 'clinical trial', 'клінічні дослідження'
            ],
            'weight': 5,
            'priority': 1,
            'semantic_markers': ['diagnosis', 'treatment', 'clinical', 'patient']
        },
        'medical_regulatory': {
            'keywords': [
                'regulatory', 'регуляторн', 'approval', 'схваленн', 'fda', 'ema',
                'clinical trial', 'клінічні дослідження', 'protocol', 'протокол',
                'submission', 'подання', 'compliance', 'відповідність', 'quality assurance',
                'забезпечення якості', 'medical device', 'медичний виріб', 'pharmaceutical',
                'фармацевтичн'
            ],
            'weight': 4,
            'priority': 2,
            'semantic_markers': ['regulatory', 'compliance', 'approval']
        },
        'clinical_evaluation': {
            'keywords': [
                'клінічн', 'clinical', 'evaluation', 'оцінк', 'patient assessment',
                'оцінка пацієнта', 'treatment plan', 'план лікування', 'follow-up',
                'спостереження', 'outcome', 'результат', 'effectiveness', 'ефективність',
                'safety', 'безпека', 'side effects', 'побічні ефекти', 'risk-benefit',
                'ризик-користь'
            ],
            'weight': 4,
            'priority': 2,
            'semantic_markers': ['evaluation', 'assessment', 'outcome']
        },
        'cybersecurity': {
            'keywords': [
                'security', 'безпека', 'cybersecurity', 'кібербезпека', 'pentest',
                'vulnerability', 'вразливість', 'exploit', 'firewall', 'encryption',
                'шифрування', 'authentication', 'oauth', 'jwt', 'csrf', 'xss',
                'sql injection', 'malware', 'reverse engineering', 'forensics', 'soc',
                'siem', 'zero trust', 'gdpr', 'compliance', 'audit'
            ],
            'weight': 5,
            'priority': 1,
            'semantic_markers': ['security', 'vulnerability', 'assessment']
        },
        'financial_analysis': {
            'keywords': [
                'фінанс', 'finance', 'інвестиц', 'investment', 'trading', 'трейдинг',
                'portfolio', 'портфель', 'valuation', 'оцінк', 'dcf', 'p/e', 'бенчмарк',
                'risk', 'ризик', 'hedge', 'хеджуванн', 'derivatives', 'деривативи',
                'accounting', 'бухгалтер', 'financial statements', 'звітність', 'crypto',
                'blockchain', 'defi', 'tokenomics', 'venture capital', 'private equity',
                'ipo', 'm&a'
            ],
            'weight': 5,
            'priority': 1,
            'semantic_markers': ['analysis', 'valuation', 'risk']
        },
        'legal_analysis': {
            'keywords': [
                'право', 'закон', 'legal', 'law', 'договір', 'contract', 'суд', 'court',
                'юридичн', 'attorney', 'адвокат', 'regulation', 'регулюванн', 'compliance',
                'gdpr', 'intellectual property', 'patent', 'патент', 'trademark',
                'copyright', 'авторськ', 'litigation', 'arbitration', 'арбітраж',
                'constitution', 'конституц', 'criminal', 'кримінальн', 'civil law'
            ],
            'weight': 5,
            'priority': 1,
            'semantic_markers': ['legal', 'law', 'jurisdiction']
        },
        'programming': {
            'keywords': [
                'код', 'code', 'python', 'javascript', 'typescript', 'react', 'vue',
                'angular', 'api', 'sql', 'database', 'алгоритм', 'algorithm', 'debug',
                'рефактор', 'refactor', 'function', 'клас', 'class', 'library', 'framework',
                'git', 'docker', 'kubernetes', 'backend', 'frontend', 'fullstack',
                'microservice', 'rest', 'graphql', 'websocket', 'regex', 'тест', 'testing'
            ],
            'weight': 4,
            'priority': 2,
            'semantic_markers': ['code', 'programming', 'development']
        },
        'scientific_research': {
            'keywords': [
                'research', 'дослідженн', 'science', 'наук', 'experiment', 'експеримент',
                'methodology', 'методолог', 'peer review', 'рецензув', 'publication',
                'публікац', 'hypothesis', 'гіпотеза', 'theory', 'теорія', 'analysis',
                'аналіз', 'data analysis', 'аналіз даних', 'statistics', 'статистик',
                'laboratory', 'лабораторн', 'scientific method', 'науковий метод'
            ],
            'weight': 4,
            'priority': 2,
            'semantic_markers': ['research', 'scientific', 'experimental']
        },
        'data_science': {
            'keywords': [
                'data science', 'machine learning', 'ml', 'deep learning', 'нейронна',
                'neural', 'tensorflow', 'pytorch', 'sklearn', 'pandas', 'numpy',
                'dataset', 'датасет', 'model training', 'навчання моделі', 'classification',
                'regression', 'clustering', 'nlp', 'computer vision', 'feature engineering',
                'hyperparameter', 'cross-validation', 'overfitting', 'embedding', 'rag'
            ],
            'weight': 4,
            'priority': 2,
            'semantic_markers': ['data', 'model', 'analysis']
        },
        'business_strategy': {
            'keywords': [
                'стратегія', 'strategy', 'бізнес', 'business', 'startup', 'стартап',
                'go-to-market', 'product market fit', 'unit economics', 'burn rate',
                'swot', 'porter', 'mckinsey', 'bcg matrix', 'okr', 'balanced scorecard',
                'competitive', 'конкурентн', 'market entry', 'виведення продукту',
                'scaling', 'масштабуванн', 'operations', 'операційн'
            ],
            'weight': 3,
            'priority': 3,
            'semantic_markers': ['strategy', 'business', 'market']
        },
        'product_management': {
            'keywords': [
                'product', 'продукт', 'product management', 'управління продуктом',
                'roadmap', 'дорожня карта', 'feature', 'функція', 'user story',
                'користувацька історія', 'sprint', 'backlog', 'беклог', 'agile',
                'scrum', 'product owner', 'власник продукту', 'MVP', 'product-market fit',
                'customer development', 'розвиток клієнтів'
            ],
            'weight': 3,
            'priority': 3,
            'semantic_markers': ['product', 'management', 'development']
        }
    }
    
    @classmethod
    def classify(cls, text: str) -> Dict[str, Any]:
        try:
            text_lower = text.lower()
            
            scores = {}
            matched_keywords = {}
            
            for domain, config in cls.DOMAINS.items():
                hits = [kw for kw in config['keywords'] if kw in text_lower]
                if hits:
                    score = len(hits) * config['weight']
                    semantic_bonus = sum(1 for m in config.get('semantic_markers', []) 
                                       if m in text_lower) * 3
                    score += semantic_bonus
                    scores[domain] = score
                    matched_keywords[domain] = hits
            
            if not scores:
                return {'domain': 'general', 'confidence': 'Low', 'score': 0}
            
            priority_bonus = {domain: cfg['priority'] * 2 
                            for domain, cfg in cls.DOMAINS.items()}
            
            for domain in scores:
                scores[domain] += priority_bonus.get(domain, 0)
            
            best_domain = max(scores, key=scores.get)
            best_score = scores[best_domain]
            
            total_keywords = sum(len(kw) for kw in cls.DOMAINS[best_domain]['keywords'])
            matched_count = len(matched_keywords.get(best_domain, []))
            confidence_ratio = matched_count / max(total_keywords / 20, 1)
            
            if confidence_ratio > 0.3:
                confidence = 'High'
            elif confidence_ratio > 0.15:
                confidence = 'Moderate'
            else:
                confidence = 'Low'
            
            return {
                'domain': best_domain,
                'confidence': confidence,
                'score': best_score,
                'matched_keywords': matched_keywords.get(best_domain, []),
                'alternatives': sorted(scores.items(), key=lambda x: x[1], reverse=True)[1:3]
            }
            
        except Exception:
            return {'domain': 'general', 'confidence': 'Low', 'score': 0}

# ============================================================================
# EXPERT ROLE DEFINITIONS
# ============================================================================

class ExpertRoles:
    ROLES = {
        'intelligence_analysis': {
            'uk': 'Старший аналітик розвідки (Senior Intelligence Analyst)\\n\\n**Експертиза:**\\n- 20+ років досвіду в OSINT, стратегічній розвідці та геополітичному аналізі\\n- Глибоке розуміння Structured Analytic Techniques (SAT)\\n- Досвід роботи з відкритими та закритими джерелами інформації\\n- Експертиза в аналізі загроз та ризиків\\n\\n**Повноваження:**\\n- Проводити повний аналітичний цикл: збір → обробка → аналіз → оцінка → прогноз\\n- Застосовувати методики ACH, Red Team, Key Assumptions Check\\n- Оцінювати достовірність джерел та інформації\\n- Розробляти сценарні прогнози та ризик-матриці\\n\\n**Методологічний підхід:**\\n- Чітке розрізнення: Факт / Оцінка / Припущення / Прогноз\\n- Застосування Structured Analytic Techniques\\n- Явне зазначення рівнів достовірності\\n- Виявлення інформаційних прогалин\\n- Альтернативні гіпотези та сценарії',
            'en': 'Senior Intelligence Analyst\\n\\n**Expertise:**\\n- 20+ years in OSINT, strategic intelligence, and geopolitical analysis\\n- Deep understanding of Structured Analytic Techniques (SAT)\\n- Experience with open and classified intelligence sources\\n- Expertise in threat and risk analysis\\n\\n**Authority:**\\n- Conduct full analytical cycle: collection → processing → analysis → assessment → forecast\\n- Apply ACH, Red Team, Key Assumptions Check methodologies\\n- Assess source and information reliability\\n- Develop scenario forecasts and risk matrices\\n\\n**Methodological Approach:**\\n- Clear distinction: Fact / Assessment / Assumption / Forecast\\n- Application of Structured Analytic Techniques\\n- Explicit confidence level specification\\n- Information gap identification\\n- Alternative hypotheses and scenarios'
        },
        'osint': {
            'uk': 'Старший спеціаліст з OSINT та розслідувань\\n\\n**Експертиза:**\\n- 15+ років досвіду в OSINT та цифрових розслідуваннях\\n- Експертиза в геолокації, аналізі соціальних мереж та верифікації\\n- Досвід роботи з даними з відкритих джерел\\n- Розробка методологій OSINT\\n\\n**Повноваження:**\\n- Проводити комплексні OSINT-розслідування\\n- Верифікувати інформацію з відкритих джерел\\n- Аналізувати соціальні медіа та цифрові сліди\\n- Створювати профілі та зв\\\'язки між об\\\'єктами\\n\\n**Методологічний підхід:**\\n- Систематичний збір та аналіз даних\\n- Кросс-верифікація джерел\\n- Документування процесу розслідування\\n- Оцінка достовірності знайденої інформації',
            'en': 'Senior OSINT and Investigations Specialist\\n\\n**Expertise:**\\n- 15+ years in OSINT and digital investigations\\n- Expertise in geolocation, social media analysis, and verification\\n- Experience with open source data collection\\n- OSINT methodology development\\n\\n**Authority:**\\n- Conduct comprehensive OSINT investigations\\n- Verify information from open sources\\n- Analyze social media and digital footprints\\n- Create profiles and entity relationships\\n\\n**Methodological Approach:**\\n- Systematic data collection and analysis\\n- Cross-source verification\\n- Investigation process documentation\\n- Information reliability assessment'
        },
        'strategic_risk': {
            'uk': 'Старший експерт зі стратегічних ризиків\\n\\n**Експертиза:**\\n- 15+ років у стратегічному ризик-менеджменті\\n- Експертиза в сценарному плануванні та кризовому менеджменті\\n- Досвід роботи з ризик-матрицями та ранжуванням загроз\\n- Розробка стратегій пом\\\'якшення ризиків\\n\\n**Повноваження:**\\n- Проводити комплексну оцінку стратегічних ризиків\\n- Розробляти сценарні плани (best/base/worst case)\\n- Визначати ключові індикатори ризиків\\n- Створювати стратегії реагування\\n\\n**Методологічний підхід:**\\n- Ідентифікація та класифікація ризиків\\n- Кількісна та якісна оцінка впливу\\n- Сценарне моделювання та стрес-тестування\\n- Моніторинг індикаторів раннього попередження',
            'en': 'Senior Strategic Risk Expert\\n\\n**Expertise:**\\n- 15+ years in strategic risk management\\n- Expertise in scenario planning and crisis management\\n- Experience with risk matrices and threat prioritization\\n- Risk mitigation strategy development\\n\\n**Authority:**\\n- Conduct comprehensive strategic risk assessment\\n- Develop scenario plans (best/base/worst case)\\n- Define key risk indicators\\n- Create response strategies\\n\\n**Methodological Approach:**\\n- Risk identification and classification\\n- Quantitative and qualitative impact assessment\\n- Scenario modeling and stress testing\\n- Early warning indicator monitoring'
        },
        'medical_diagnostics': {
            'uk': 'Діагност-клініцист, MD, PhD\\n\\n**Експертиза:**\\n- 20+ років клінічної практики\\n- Evidence-Based Medicine (EBM) експертиза\\n- Диференційна діагностика складних випадків\\n- Робота з клінічними настановами (WHO, CDC, EMA)\\n\\n**Повноваження:**\\n- Проводити повний діагностичний цикл\\n- Застосовувати EBM принципи та клінічні настанови\\n- Оцінювати рівень доказовості (Grade A/B/C)\\n- Виявляти "червоні прапорці" (red flags)\\n- Розробляти диференційні діагнози з оцінкою ймовірностей\\n\\n**Методологічний підхід:**\\n- Систематичний збір анамнезу\\n- Структурована диференційна діагностика\\n- Застосування клінічних настанов\\n- Оцінка ризиків та переваг лікування\\n- Чітке зазначення рівнів доказовості',
            'en': 'Clinician-Diagnostician, MD, PhD\\n\\n**Expertise:**\\n- 20+ years of clinical practice\\n- Evidence-Based Medicine (EBM) expertise\\n- Differential diagnosis of complex cases\\n- Clinical guidelines experience (WHO, CDC, EMA)\\n\\n**Authority:**\\n- Conduct complete diagnostic cycle\\n- Apply EBM principles and clinical guidelines\\n- Assess evidence levels (Grade A/B/C)\\n- Identify red flags\\n- Develop differential diagnoses with probability estimates\\n\\n**Methodological Approach:**\\n- Systematic history collection\\n- Structured differential diagnosis\\n- Clinical guideline application\\n- Risk-benefit treatment assessment\\n- Explicit evidence level specification'
        },
        'cybersecurity': {
            'uk': 'Старший експерт з кібербезпеки / Penetration Tester\\n\\n**Експертиза:**\\n- 15+ років у кібербезпеці та тестуванні на проникнення\\n- Сертифікації: OSCP, CEH, CISSP\\n- Експертиза в MITRE ATT&CK, STRIDE, CVSS\\n- Досвід у побудові програм безпеки\\n\\n**Повноваження:**\\n- Проводити повний цикл оцінки безпеки\\n- Виконувати тестування на проникнення\\n- Оцінювати вразливості за CVSS\\n- Розробляти стратегії захисту\\n\\n**Методологічний підхід:**\\n- Систематичне картування поверхні атаки\\n- Моделювання загроз (STRIDE/MITRE ATT&CK)\\n- Кількісна оцінка критичності вразливостей\\n- Документування кроків та доказів\\n- Пріоритезація рекомендацій',
            'en': 'Senior Cybersecurity Expert / Penetration Tester\\n\\n**Expertise:**\\n- 15+ years in cybersecurity and penetration testing\\n- Certifications: OSCP, CEH, CISSP\\n- Expertise in MITRE ATT&CK, STRIDE, CVSS\\n- Security program development experience\\n\\n**Authority:**\\n- Conduct full security assessment cycle\\n- Execute penetration testing\\n- Assess vulnerabilities via CVSS\\n- Develop protection strategies\\n\\n**Methodological Approach:**\\n- Systematic attack surface mapping\\n- Threat modeling (STRIDE/MITRE ATT&CK)\\n- Quantitative vulnerability severity assessment\\n- Step and evidence documentation\\n- Recommendation prioritization'
        },
        'financial_analysis': {
            'uk': 'Старший фінансовий аналітик / CFA\\n\\n**Експертиза:**\\n- 15+ років у фінансовому аналізі та моделюванні\\n- Сертифікація CFA\\n- Експертиза в оцінці активів та інвестиціях\\n- Досвід у фінансовому прогнозуванні\\n\\n**Повноваження:**\\n- Проводити повний фінансовий аналіз\\n- Створювати фінансові моделі (DCF, comparables)\\n- Оцінювати активи та інвестиційні можливості\\n- Розробляти фінансові прогнози\\n\\n**Методологічний підхід:**\\n- Явне зазначення всіх припущень моделі\\n- Застосування методів оцінки (DCF, comparables)\\n- Аналіз чутливості до ключових параметрів\\n- Розробка сценаріїв (bull/base/bear)\\n- Оцінка систематичних та ідіосинкратичних ризиків',
            'en': 'Senior Financial Analyst / CFA\\n\\n**Expertise:**\\n- 15+ years in financial analysis and modeling\\n- CFA certification\\n- Asset valuation and investment expertise\\n- Financial forecasting experience\\n\\n**Authority:**\\n- Conduct full financial analysis\\n- Create financial models (DCF, comparables)\\n- Value assets and investment opportunities\\n- Develop financial forecasts\\n\\n**Methodological Approach:**\\n- Explicit model assumption specification\\n- Valuation method application (DCF, comparables)\\n- Sensitivity analysis on key parameters\\n- Scenario development (bull/base/bear)\\n- Systematic and idiosyncratic risk assessment'
        },
        'legal_analysis': {
            'uk': 'Старший юридичний консультант / Адвокат\\n\\n**Експертиза:**\\n- 15+ років юридичної практики\\n- Спеціалізація в галузевих правових питаннях\\n- Досвід у правовому аналізі та стратегії\\n- Робота з нормативно-правовими актами та прецедентами\\n\\n**Повноваження:**\\n- Проводити комплексний правовий аналіз\\n- Аналізувати правові ризики та їх ймовірність\\n- Консультувати щодо правових стратегій\\n- Розробляти правові позиції\\n\\n**Методологічний підхід:**\\n- Чітке зазначення юрисдикції\\n- Посилання на конкретні норми та статті\\n- Аналіз релевантної судової практики\\n- Оцінка правових ризиків\\n- Альтернативні правові підходи\\n- Застереження про інформаційний характер відповіді',
            'en': 'Senior Legal Consultant / Attorney\\n\\n**Expertise:**\\n- 15+ years of legal practice\\n- Specialization in relevant legal areas\\n- Legal analysis and strategy experience\\n- Regulatory and precedent work\\n\\n**Authority:**\\n- Conduct comprehensive legal analysis\\n- Analyze legal risks and their probability\\n- Advise on legal strategies\\n- Develop legal positions\\n\\n**Methodological Approach:**\\n- Clear jurisdiction specification\\n- Specific statute and article references\\n- Relevant case law analysis\\n- Legal risk assessment\\n- Alternative legal approaches\\n- Informational response disclaimer'
        },
        'programming': {
            'uk': 'Старший Software Engineer / Tech Lead\\n\\n**Експертиза:**\\n- 15+ років розробки програмного забезпечення\\n- Архітектура систем, SOLID, DRY, clean code\\n- Експертиза в різних мовах та фреймворках\\n- Досвід технічного лідерства\\n\\n**Повноваження:**\\n- Проектувати архітектуру систем\\n- Писати робочий, протестований код\\n- Приймати технічні рішення\\n- Оцінювати складність та trade-offs\\n\\n**Методологічний підхід:**\\n- Аналіз вимог: edge cases, error handling, performance constraints\\n- Вибір архітектурного патерну з обґрунтуванням\\n- Чистий, читабельний код з коментарями\\n- Unit tests для критичних шляхів\\n- Документація (docstring/README)\\n- Оцінка O(n) time/space complexity',
            'en': 'Senior Software Engineer / Tech Lead\\n\\n**Expertise:**\\n- 15+ years of software development\\n- System architecture, SOLID, DRY, clean code\\n- Multiple languages and frameworks expertise\\n- Technical leadership experience\\n\\n**Authority:**\\n- Design system architecture\\n- Write working, tested code\\n- Make technical decisions\\n- Assess complexity and trade-offs\\n\\n**Methodological Approach:**\\n- Requirements analysis: edge cases, error handling, performance\\n- Architecture pattern selection with justification\\n- Clean, readable code with comments\\n- Unit tests for critical paths\\n- Documentation (docstring/README)\\n- O(n) time/space complexity assessment'
        },
        'scientific_research': {
            'uk': 'Дослідник / Науковий співробітник, PhD\\n\\n**Експертиза:**\\n- 15+ років наукових досліджень\\n- Експертиза в методології досліджень\\n- Досвід публікацій у рецензованих журналах\\n- Керівництво дослідницькими проектами\\n\\n**Повноваження:**\\n- Проектувати та проводити наукові дослідження\\n- Аналізувати емпіричні дані\\n- Перевіряти та відтворювати результати\\n- Публікувати та презентувати знахідки\\n\\n**Методологічний підхід:**\\n- Чітке формулювання гіпотез\\n- Вибір методології дослідження\\n- Збір та аналіз емпіричних даних\\n- Статистичний аналіз з оцінкою значущості\\n- Розрізнення кореляції та причинності\\n- Публікація та рецензування результатів',
            'en': 'Research Scientist / PhD\\n\\n**Expertise:**\\n- 15+ years of scientific research\\n- Research methodology expertise\\n- Peer-reviewed publication experience\\n- Research project leadership\\n\\n**Authority:**\\n- Design and conduct scientific research\\n- Analyze empirical data\\n- Verify and reproduce results\\n- Publish and present findings\\n\\n**Methodological Approach:**\\n- Clear hypothesis formulation\\n- Research methodology selection\\n- Empirical data collection and analysis\\n- Statistical analysis with significance assessment\\n- Correlation vs causation distinction\\n- Publication and peer review'
        },
        'data_science': {
            'uk': 'Lead Data Scientist\\n\\n**Експертиза:**\\n- 10+ років у Data Science та Machine Learning\\n- Експертиза в статистиці та машинному навчанні\\n- Досвід звеличення моделей та їх інтерпретації\\n- Робота з великими даними та їх візуалізацією\\n\\n**Повноваження:**\\n- Проводити повний цикл Data Science проектів\\n- Розробляти та валідувати моделі ML\\n- Інтерпретувати результати моделей\\n- Впроваджувати рішення в production\\n\\n**Методологічний підхід:**\\n- EDA: розподіл даних, missing values, outliers, кореляції\\n- Feature Engineering: трансформації, нові ознаки, відбір\\n- Baseline модель перед складними підходами\\n- Validation: cross-validation, train/val/test split, no leakage\\n- Вибір релевантної метрики (F1/AUC/RMSE)\\n- Interpretability: SHAP/LIME де доречно\\n- Deployment: latency, memory, drift monitoring',
            'en': 'Lead Data Scientist\\n\\n**Expertise:**\\n- 10+ years in Data Science and Machine Learning\\n- Statistics and Machine Learning expertise\\n- Model scaling and interpretation experience\\n- Big data and visualization experience\\n\\n**Authority:**\\n- Conduct full Data Science project cycle\\n- Develop and validate ML models\\n- Interpret model results\\n- Deploy solutions to production\\n\\n**Methodological Approach:**\\n- EDA: distribution, missing values, outliers, correlations\\n- Feature Engineering: transformations, new features, selection\\n- Baseline model before complex approaches\\n- Validation: cross-validation, train/val/test split, no leakage\\n- Relevant metric selection (F1/AUC/RMSE)\\n- Interpretability: SHAP/LIME where relevant\\n- Deployment: latency, memory, drift monitoring'
        },
        'business_strategy': {
            'uk': 'Старший стратег бізнесу / MBA\\n\\n**Експертиза:**\\n- 15+ років у стратегічному консалтингу\\n- MBA та досвід роботи з провідними консалтинговими компаніями\\n- Експертиза у структуруванні бізнес-проблем\\n- Досвід розробки стратегій зростання\\n\\n**Повноваження:**\\n- Розробляти бізнес-стратегії\\n- Проводити стратегічний аналіз (SWOT, Porter\\\'s Five Forces)\\n- Оцінювати ринкові можливості\\n- Створювати дорожні карти реалізації стратегії\\n\\n**Методологічний підхід:**\\n- Структурування проблем через McKinsey/BCG frameworks\\n- Аналіз з першопринципів та data-driven підхід\\n- Розгляд альтернативних стратегій та trade-offs\\n- Оцінка ринку, конкурентів та трендів\\n- Розробка дорожньої карти та KPI',
            'en': 'Senior Business Strategist / MBA\\n\\n**Expertise:**\\n- 15+ years in strategic consulting\\n- MBA and experience with leading consulting firms\\n- Business problem structuring expertise\\n- Growth strategy development experience\\n\\n**Authority:**\\n- Develop business strategies\\n- Conduct strategic analysis (SWOT, Porter\\\'s Five Forces)\\n- Assess market opportunities\\n- Create strategy implementation roadmaps\\n\\n**Methodological Approach:**\\n- Problem structuring via McKinsey/BCG frameworks\\n- First principles and data-driven analysis\\n- Alternative strategy and trade-off consideration\\n- Market, competitor, and trend assessment\\n- Roadmap and KPI development'
        },
        'product_management': {
            'uk': 'Senior Product Manager\\n\\n**Експертиза:**\\n- 10+ років у продуктовому менеджменті\\n- Досвід управління продуктами від ідеї до запуску\\n- Експертиза в Agile, Scrum, MVP розробці\\n- Робота з користувацьким досвідом та вимогами\\n\\n**Повноваження:**\\n- Визначати продуктову стратегію та дорожню карту\\n- Управляти продуктовим беклогом\\n- Проводити дослідження користувачів\\n- Координувати команди розробки\\n\\n**Методологічний підхід:**\\n- Визначення продукт-маркет фіту\\n- Розробка користувацьких історій та вимог\\n- Пріоритезація функціоналу (MoSCoW, RICE)\\n- Проведення досліджень користувачів (interviews, surveys)\\n- Аналіз ринку та конкурентів\\n- Визначення та моніторинг KPI продукту',
            'en': 'Senior Product Manager\\n\\n**Expertise:**\\n- 10+ years in product management\\n- End-to-end product management experience\\n- Agile, Scrum, MVP development expertise\\n- User experience and requirements experience\\n\\n**Authority:**\\n- Define product strategy and roadmap\\n- Manage product backlog\\n- Conduct user research\\n- Coordinate development teams\\n\\n**Methodological Approach:**\\n- Product-market fit definition\\n- User story and requirement development\\n- Feature prioritization (MoSCoW, RICE)\\n- User research (interviews, surveys)\\n- Market and competitor analysis\\n- Product KPI definition and monitoring'
        },
        'general': {
            'uk': 'Універсальний експерт-консультант\\n\\n**Експертиза:**\\n- Широка міждисциплінарна ерудиція\\n- Аналітичне мислення та практичний підхід\\n- Адаптація глибини та стилю під конкретний запит\\n- Критичне мислення та аргументація\\n\\n**Повноваження:**\\n- Аналізувати запити різної складності\\n- Надавати структуровані, практичні відповіді\\n- Виявляти неоднозначності та уточнювати запити\\n- Рекомендувати подальші кроки\\n\\n**Методологічний підхід:**\\n- Аналіз запиту перед відповіддю, уточнення\\n- Структурування відповіді логічно та послідовно\\n- Підкріплення тверджень прикладами або даними\\n- Явне зазначення обмежень та невизначеностей\\n- Практичні рекомендації та наступні кроки',
            'en': 'Versatile Expert Consultant\\n\\n**Expertise:**\\n- Broad interdisciplinary knowledge\\n- Analytical thinking and practical approach\\n- Adapt depth and style to specific requests\\n- Critical thinking and argumentation\\n\\n**Authority:**\\n- Analyze various complexity requests\\n- Provide structured, practical responses\\n- Identify ambiguities and clarify requests\\n- Recommend next steps\\n\\n**Methodological Approach:**\\n- Request analysis before responding\\n- Logical and sequential response structuring\\n- Claim support with examples or data\\n- Explicit limitation and uncertainty identification\\n- Practical recommendations and next steps'
        }
    }
    
    @classmethod
    def get_role(cls, domain: str, lang: str) -> str:
        role_data = cls.ROLES.get(domain, cls.ROLES['general'])
        return role_data.get(lang, role_data['en'])

# ============================================================================
# DOMAIN-SPECIFIC METHODOLOGIES
# ============================================================================

class Methodologies:
    @staticmethod
    def get_methodology(domain: str, lang: str) -> str:
        method = Methodologies._get_domain_method(domain)
        return method.get(lang, method.get('en', ''))
    
    @staticmethod
    def _get_domain_method(domain: str) -> Dict:
        methodologies = {
            'intelligence_analysis': {
                'uk': '''## Аналітична методологія (Intelligence Analysis)

### 1. Information Collection
- Systematic identification of relevant information sources
- Classification of sources (primary/secondary, open/closed)
- Documentation of collection methodology and timeline
- Preservation of context and metadata

### 2. Source Validation and Reliability Assessment
- **Source Validation**: Verify source authenticity and credibility
- **Reliability Assessment**: Apply A-H / 1-6 reliability scale
- Cross-validation across multiple independent sources
- Identify and document source limitations and biases

### 3. ACH (Analysis of Competing Hypotheses)
- Formulation of minimum 3-5 competing hypotheses
- Evaluation of each piece of evidence against each hypothesis
- Identification of discriminating evidence
- Hypothesis ranking by evidence consistency

### 4. Key Assumptions Check
- Explicit identification of key analytical assumptions
- Testing assumptions for validity and sensitivity
- Identification of alternative assumptions
- Assessment of impact if assumptions are wrong

### 5. Red Team Analysis
- **Challenge Assumptions**: Systematic testing of all assumptions
- **Search for Disconfirming Evidence**: Actively seek contradictory evidence
- **Alternative Explanations**: Generate competing interpretations
- **Adversarial Review**: Critically review conclusions from adversarial perspective
- **Failure Scenario Analysis**: Identify how conclusions could be wrong

### 6. Bias Control
- Active identification and mitigation of cognitive biases
- Confirmation bias: actively search for disconfirming evidence
- Anchoring bias: consider multiple reference points
- Mirror imaging: analyze from adversary perspective
- Structured analytic techniques to counter bias

### 7. Scenario Analysis
- **Scenario Matrix**: Best Case / Baseline / Worst Case
- Identification of key drivers and uncertainties
- Probability assessment for each scenario
- Identification of indicators for scenario shifts

### 8. Risk Matrix
- Probability × Impact assessment for each risk
- Risk categorization and prioritization
- Identification of risk interdependencies
- Assessment of risk mitigation options

### 9. Confidence Assessment
- **Confidence Levels**: High / Moderate / Low for each statement
- Explicit rationale for confidence assessment
- Identification of factors affecting confidence
- Documentation of analytical uncertainty

### 10. Information Gaps Methodology
- **What information is missing?** Systematic gap identification
- **Confidence impact**: Assess how gaps affect confidence
- **Collection opportunities**: Identify how gaps can be filled
- **Assumptions affected**: Identify affected analytical assumptions
- **Decision impact**: Assess impact on decision-making

### 11. Warning Indicators
- Identification of key indicators for threats/opportunities
- Threshold definition for each indicator
- Monitoring plan with timelines
- Contingency planning based on indicator changes

### 12. Communication of Results
- Executive Summary with key findings
- Detailed structure: Facts → Assessments → Assumptions → Forecasts
- Clear information gap specification
- Alternative scenarios and probabilities
- Monitoring recommendations''',
                'en': '''## Analytical Methodology (Intelligence Analysis)

### 1. Information Collection
- Systematic identification of relevant information sources
- Classification of sources (primary/secondary, open/closed)
- Documentation of collection methodology and timeline
- Preservation of context and metadata

### 2. Source Validation and Reliability Assessment
- **Source Validation**: Verify source authenticity and credibility
- **Reliability Assessment**: Apply A-H / 1-6 reliability scale
- Cross-validation across multiple independent sources
- Identify and document source limitations and biases

### 3. ACH (Analysis of Competing Hypotheses)
- Formulation of minimum 3-5 competing hypotheses
- Evaluation of each piece of evidence against each hypothesis
- Identification of discriminating evidence
- Hypothesis ranking by evidence consistency

### 4. Key Assumptions Check
- Explicit identification of key analytical assumptions
- Testing assumptions for validity and sensitivity
- Identification of alternative assumptions
- Assessment of impact if assumptions are wrong

### 5. Red Team Analysis
- **Challenge Assumptions**: Systematic testing of all assumptions
- **Search for Disconfirming Evidence**: Actively seek contradictory evidence
- **Alternative Explanations**: Generate competing interpretations
- **Adversarial Review**: Critically review conclusions from adversarial perspective
- **Failure Scenario Analysis**: Identify how conclusions could be wrong

### 6. Bias Control
- Active identification and mitigation of cognitive biases
- Confirmation bias: actively search for disconfirming evidence
- Anchoring bias: consider multiple reference points
- Mirror imaging: analyze from adversary perspective
- Structured analytic techniques to counter bias

### 7. Scenario Analysis
- **Scenario Matrix**: Best Case / Baseline / Worst Case
- Identification of key drivers and uncertainties
- Probability assessment for each scenario
- Identification of indicators for scenario shifts

### 8. Risk Matrix
- Probability × Impact assessment for each risk
- Risk categorization and prioritization
- Identification of risk interdependencies
- Assessment of risk mitigation options

### 9. Confidence Assessment
- **Confidence Levels**: High / Moderate / Low for each statement
- Explicit rationale for confidence assessment
- Identification of factors affecting confidence
- Documentation of analytical uncertainty

### 10. Information Gaps Methodology
- **What information is missing?** Systematic gap identification
- **Confidence impact**: Assess how gaps affect confidence
- **Collection opportunities**: Identify how gaps can be filled
- **Assumptions affected**: Identify affected analytical assumptions
- **Decision impact**: Assess impact on decision-making

### 11. Warning Indicators
- Identification of key indicators for threats/opportunities
- Threshold definition for each indicator
- Monitoring plan with timelines
- Contingency planning based on indicator changes

### 12. Communication of Results
- Executive Summary with key findings
- Detailed structure: Facts → Assessments → Assumptions → Forecasts
- Clear information gap specification
- Alternative scenarios and probabilities
- Monitoring recommendations'''
            },
            'medical_diagnostics': {
                'uk': '''## Діагностична методологія (Evidence-Based Medicine)

### 1. Збір анамнезу
- Систематичний збір даних про пацієнта
- Основний симптом/скарга з деталізацією
- Історія хвороби та хронічні стани
- Сімейний анамнез та фактори ризику

### 2. Диференційна діагностика
- Формулювання мінімум 3-5 діагностичних гіпотез
- Оцінка ймовірності кожної гіпотези
- Визначення "червоних прапорців" (red flags)
- Планування необхідних досліджень

### 3. Evidence-Based Decision Making
- **Рівні доказовості**:
  - Grade A: RCT, систематичні огляди
  - Grade B: когортні дослідження, case-control
  - Grade C: думка експертів, клінічний досвід
- **Клінічні настанови**: WHO, CDC, EMA, локальні протоколи
- Оцінка ризику/користі лікування

### 4. Bias Control
- Confirmation bias: actively seek disconfirming evidence
- Availability bias: consider systematic data collection
- Selection bias: ensure representative patient data
- Systematic documentation of clinical reasoning

### 5. Рекомендації
- Чіткі, конкретні, безпечні рекомендації
- Альтернативні підходи з обґрунтуванням
- План спостереження та подальших дій
- Застереження про інформаційний характер відповіді''',
                'en': '''## Diagnostic Methodology (Evidence-Based Medicine)

### 1. History Collection
- Systematic patient data collection
- Primary symptom/complaint with details
- Disease history and chronic conditions
- Family history and risk factors

### 2. Differential Diagnosis
- Minimum 3-5 diagnostic hypotheses
- Probability assessment for each hypothesis
- Red flag identification
- Required investigation planning

### 3. Evidence-Based Decision Making
- **Evidence Levels**:
  - Grade A: RCTs, systematic reviews
  - Grade B: Cohort studies, case-control
  - Grade C: Expert opinion, clinical experience
- **Clinical Guidelines**: WHO, CDC, EMA, local protocols
- Treatment risk/benefit assessment

### 4. Bias Control
- Confirmation bias: actively seek disconfirming evidence
- Availability bias: consider systematic data collection
- Selection bias: ensure representative patient data
- Systematic documentation of clinical reasoning

### 5. Recommendations
- Clear, specific, safe recommendations
- Alternative approaches with justification
- Follow-up and action plan
- Informational response disclaimer'''
            },
            'cybersecurity': {
                'uk': '''## Методологія оцінки безпеки

### 1. Планування та визначення обсягу
- Визначення меж тестування та цілей
- Розробка стратегії тестування
- Вибір методології та інструментів
- Погодження обсягу з зацікавленими сторонами

### 2. Збір інформації
- Розвідка та збір даних про цільову систему
- Картування поверхні атаки
- Ідентифікація потенційних вразливостей
- Аналіз конфігурацій та архітектури

### 3. Оцінка та аналіз
- **Threat Modeling**: STRIDE, MITRE ATT&CK
- **Vulnerability Assessment**: CVSS scoring
- Експлуатація вразливостей (ethical hacking)
- Аналіз впливу та критичності

### 4. Bias Control
- Confirmation bias: challenge vulnerability assumptions
- Availability bias: consider systematic vulnerability assessment
- Selection bias: ensure comprehensive testing scope

### 5. Звітність та рекомендації
- Документування знайдених вразливостей
- CVSS оцінка критичності кожної вразливості
- Конкретні рекомендації з пріоритетами
- Дорожня карта усунення вразливостей''',
                'en': '''## Security Assessment Methodology

### 1. Planning and Scope Definition
- Testing boundaries and objectives definition
- Testing strategy development
- Methodology and tool selection
- Scope agreement with stakeholders

### 2. Information Collection
- Reconnaissance and target data collection
- Attack surface mapping
- Potential vulnerability identification
- Configuration and architecture analysis

### 3. Assessment and Analysis
- **Threat Modeling**: STRIDE, MITRE ATT&CK
- **Vulnerability Assessment**: CVSS scoring
- Vulnerability exploitation (ethical hacking)
- Impact and criticality analysis

### 4. Bias Control
- Confirmation bias: challenge vulnerability assumptions
- Availability bias: consider systematic vulnerability assessment
- Selection bias: ensure comprehensive testing scope

### 5. Reporting and Recommendations
- Vulnerability documentation
- CVSS severity scoring per vulnerability
- Specific prioritized recommendations
- Vulnerability remediation roadmap'''
            },
            'financial_analysis': {
                'uk': '''## Методологія фінансового аналізу

### 1. Збір даних та підготовка
- Збір фінансової звітності та ринкових даних
- Перевірка якості та повноти даних
- Нормалізація та стандартизація показників
- Ідентифікація ключових фінансових метрик

### 2. Аналіз та моделювання
- **Фінансове моделювання**:
  - DCF (Discounted Cash Flow)
  - Comparables метод оцінки
  - Precedent transactions аналіз
- **Аналіз чутливості** до ключових параметрів
- **Сценарний аналіз**: bull/base/bear cases

### 3. Оцінка ризиків
- Систематичні ризики (market, industry, regulatory)
- Ідіосинкратичні ризики (company-specific)
- Оцінка волатильності та VAR
- Стрес-тестування фінансової моделі

### 4. Bias Control
- Anchoring bias: consider multiple valuation methods
- Recency bias: analyze long-term historical patterns
- Selection bias: ensure representative market data

### 5. Висновки та рекомендації
- Executive Summary ключових знахідок
- Оцінка вартості та інвестиційних можливостей
- Рекомендації з чітким обґрунтуванням
- Disclaimer про рекомендаційний характер''',
                'en': '''## Financial Analysis Methodology

### 1. Data Collection and Preparation
- Financial statements and market data collection
- Data quality and completeness verification
- Indicator normalization and standardization
- Key financial metric identification

### 2. Analysis and Modeling
- **Financial Modeling**:
  - DCF (Discounted Cash Flow)
  - Comparables valuation method
  - Precedent transaction analysis
- **Sensitivity Analysis** on key parameters
- **Scenario Analysis**: bull/base/bear cases

### 3. Risk Assessment
- Systematic risks (market, industry, regulatory)
- Idiosyncratic risks (company-specific)
- Volatility and VAR assessment
- Financial model stress testing

### 4. Bias Control
- Anchoring bias: consider multiple valuation methods
- Recency bias: analyze long-term historical patterns
- Selection bias: ensure representative market data

### 5. Conclusions and Recommendations
- Executive Summary of key findings
- Value and investment opportunity assessment
- Recommendations with clear justification
- Advisory nature disclaimer'''
            },
            'legal_analysis': {
                'uk': '''## Методологія юридичного аналізу

### 1. Правовий аналіз
- Визначення застосовної юрисдикції
- Ідентифікація релевантних правових норм
- Аналіз судової практики та прецедентів
- Оцінка правового статусу та правовідносин

### 2. Оцінка правових ризиків
- Ідентифікація потенційних правових ризиків
- Оцінка ймовірності настання ризиків
- Аналіз потенційних наслідків та санкцій
- Розробка стратегій мінімізації ризиків

### 3. Правове обґрунтування
- Формулювання правової позиції
- Обґрунтування з посиланням на норми та практику
- Розгляд альтернативних правових підходів
- Оцінка перспектив у судовому або адміністративному процесі

### 4. Рекомендації
- Конкретні, практичні правові рекомендації
- План дій з урахуванням правових ризиків
- Рекомендація звернутись до спеціалізованого юриста
- Застереження про рекомендаційний характер''',
                'en': '''## Legal Analysis Methodology

### 1. Legal Analysis
- Applicable jurisdiction determination
- Relevant legal norm identification
- Case law and precedent analysis
- Legal status and relationship assessment

### 2. Legal Risk Assessment
- Potential legal risk identification
- Risk probability assessment
- Consequence and sanction analysis
- Risk minimization strategy development

### 3. Legal Justification
- Legal position formulation
- Norm and practice-based justification
- Alternative legal approach consideration
- Litigation or administrative process assessment

### 4. Recommendations
- Specific, practical legal recommendations
- Risk-aware action plan
- Specialized legal counsel recommendation
- Advisory nature disclaimer'''
            },
            'programming': {
                'uk': '''## Методологія розробки програмного забезпечення

### 1. Аналіз та планування
- Детальний аналіз вимог та технічного завдання
- Визначення edge cases та обробки помилок
- Оцінка обмежень продуктивності та масштабованості
- Вибір технологічного стеку та архітектури

### 2. Архітектурне проектування
- Визначення архітектурного патерну з обґрунтуванням
- Проектування API, інтерфейсів та компонентів
- Застосування SOLID, DRY, KISS принципів
- Документування архітектурних рішень

### 3. Розробка та реалізація
- Написання чистого, читабельного коду з коментарями
- Реалізація обробки помилок та логування
- Оптимізація продуктивності (time/space complexity)
- Покриття коду тестами (unit, integration)

### 4. Документація та доставка
- Написання документації (README, API docs, docstrings)
- Налаштування CI/CD pipeline
- Забезпечення безпеки та кіберзахисту
- План розгортання та моніторингу''',
                'en': '''## Software Development Methodology

### 1. Analysis and Planning
- Detailed requirements and specification analysis
- Edge case and error handling definition
- Performance and scalability constraint assessment
- Technology stack and architecture selection

### 2. Architectural Design
- Architecture pattern selection with justification
- API, interface, and component design
- SOLID, DRY, KISS principle application
- Architectural decision documentation

### 3. Development and Implementation
- Clean, readable, commented code writing
- Error handling and logging implementation
- Performance optimization (time/space complexity)
- Code test coverage (unit, integration)

### 4. Documentation and Delivery
- Documentation creation (README, API docs, docstrings)
- CI/CD pipeline configuration
- Security and cybersecurity assurance
- Deployment and monitoring plan'''
            },
            'scientific_research': {
                'uk': '''## Науково-дослідна методологія

### 1. Планування дослідження
- Формулювання дослідницького питання та гіпотез
- Визначення методології та дизайну дослідження
- Розробка протоколу збору даних
- Етичний аналіз та дозволи

### 2. Збір даних
- Реалізація протоколу збору даних
- Забезпечення якості та цілісності даних
- Документування процесу збору
- Збереження даних з метаданими

### 3. Аналіз та інтерпретація
- Статистичний аналіз з оцінкою значущості
- Розрізнення кореляції та причинності
- Візуалізація результатів
- Інтерпретація в контексті дослідницьких питань

### 4. Bias Control
- Confirmation bias: objective data analysis
- Selection bias: ensure representative sampling
- Publication bias: consider all relevant studies
- Systematic documentation of analytical process

### 5. Публікація та поширення
- Структуроване представлення результатів
- Підготовка до рецензування та публікації
- Презентація науковій спільноті
- Висновки та рекомендації для подальших досліджень''',
                'en': '''## Scientific Research Methodology

### 1. Research Planning
- Research question and hypothesis formulation
- Methodology and research design definition
- Data collection protocol development
- Ethical analysis and permissions

### 2. Data Collection
- Data collection protocol implementation
- Data quality and integrity assurance
- Collection process documentation
- Data with metadata preservation

### 3. Analysis and Interpretation
- Statistical analysis with significance assessment
- Correlation vs causation distinction
- Results visualization
- Interpretation within research question context

### 4. Bias Control
- Confirmation bias: objective data analysis
- Selection bias: ensure representative sampling
- Publication bias: consider all relevant studies
- Systematic documentation of analytical process

### 5. Publication and Dissemination
- Structured results presentation
- Peer review and publication preparation
- Scientific community presentation
- Conclusions and future research recommendations'''
            },
            'data_science': {
                'uk': '''## Data Science Методологія

### 1. Розуміння даних
- **EDA (Exploratory Data Analysis)**:
  - Аналіз розподілу даних (distribution)
  - Виявлення пропусків (missing values)
  - Пошук викидів (outliers)
  - Аналіз кореляцій між ознаками
- Візуалізація даних для виявлення патернів
- Формулювання гіпотез для моделювання

### 2. Підготовка даних
- **Feature Engineering**:
  - Створення нових ознак з існуючих
  - Трансформація ознак (scaling, encoding)
  - Відбір найбільш релевантних ознак
- Очищення даних від аномалій та шуму
- Розбиття даних: train/validation/test (no leakage)

### 3. Моделювання
- **Baseline модель** перед складними підходами
- Вибір та навчання моделей ML/DL
- Гіперпараметрична оптимізація
- **Validation**: cross-validation, early stopping
- Оцінка з використанням релевантних метрик

### 4. Інтерпретація та впровадження
- **Interpretability**: SHAP, LIME для важливих моделей
- Оцінка продуктивності (latency, memory)
- Моніторинг дрейфу даних та моделі
- Документування та підтримка production системи''',
                'en': '''## Data Science Methodology

### 1. Data Understanding
- **EDA (Exploratory Data Analysis)**:
  - Data distribution analysis
  - Missing values identification
  - Outlier detection
  - Feature correlation analysis
- Data visualization for pattern identification
- Hypothesis formulation for modeling

### 2. Data Preparation
- **Feature Engineering**:
  - New feature creation from existing
  - Feature transformation (scaling, encoding)
  - Relevant feature selection
- Data cleaning from anomalies and noise
- Data splitting: train/validation/test (no leakage)

### 3. Modeling
- **Baseline model** before complex approaches
- ML/DL model selection and training
- Hyperparameter optimization
- **Validation**: cross-validation, early stopping
- Relevant metric-based evaluation

### 4. Interpretation and Deployment
- **Interpretability**: SHAP, LIME for critical models
- Performance assessment (latency, memory)
- Data and model drift monitoring
- Production system documentation and support'''
            }
        }
        
        return methodologies.get(domain, methodologies.get('general', {}))
    
    @staticmethod
    def get_general_methodology(lang: str) -> str:
        general = {
            'uk': '''## Методологія відповіді
- Аналіз запиту перед відповіддю, уточнення при необхідності
- Структурування відповіді логічно та послідовно
- Підкріплення тверджень прикладами або даними
- Явне зазначення обмежень та невизначеностей
- Надання практичних рекомендацій та наступних кроків
- Використання Markdown для форматування (## розділи, ### підрозділи)''',
            'en': '''## Response Methodology
- Analyze the request before responding; clarify if needed
- Structure the response logically and sequentially
- Support claims with examples or data
- Explicitly state limitations and uncertainties
- Provide practical recommendations and next steps
- Use Markdown for formatting (## sections, ### subsections)'''
        }
        return general.get(lang, general['en'])

# ============================================================================
# INFORMATION REQUIREMENTS FRAMEWORK
# ============================================================================

def _build_information_requirements(domain: str, text: str, lang: str) -> str:
    """Build information requirements section for analytical domains."""
    analytical_domains = ['intelligence_analysis', 'osint', 'strategic_risk', 
                          'scientific_research', 'cybersecurity', 'financial_analysis']
    
    if domain not in analytical_domains:
        return ''
    
    uk = lang == 'uk'
    
    template = {
        'uk': '''## Інформаційні вимоги

### Відомі факти
- [Документовані, верифіковані факти]

### Невідомі дані
- [Ключові прогалини в інформації]

### Пріоритети збору
1. [Найбільш критична інформація для збору]
2. [Друга за важливістю інформація]
3. [Третя за важливістю інформація]

### Ключові аналітичні питання
1. [Найважливіше питання, що потребує відповіді]
2. [Друге критичне питання]
3. [Третє критичне питання]

### Інформаційні прогалини
- **Що відсутнє?** [Опис відсутньої інформації]
- **Як це впливає на достовірність?** [Оцінка впливу на достовірність]
- **Як можна зібрати?** [Методи збору відсутньої інформації]
- **Які припущення залежать?** [Припущення, що залежать від цієї інформації]
- **Які рішення залежать?** [Рішення, що залежать від цієї інформації]''',
        'en': '''## Information Requirements

### Known Facts
- [Documented, verified facts]

### Unknowns
- [Key information gaps]

### Collection Priorities
1. [Most critical information to collect]
2. [Second most critical information]
3. [Third most critical information]

### Key Intelligence Questions
1. [Most important question to answer]
2. [Second critical question]
3. [Third critical question]

### Information Gaps
- **What is missing?** [Description of missing information]
- **How does it affect confidence?** [Impact on confidence assessment]
- **How can it be collected?** [Methods to collect missing information]
- **What assumptions are affected?** [Assumptions dependent on this information]
- **What decisions are affected?** [Decisions dependent on this information]'''
    }
    
    return template.get('uk' if uk else 'en', template.get('en', ''))

# ============================================================================
# PROMPT GENERATION ENGINE
# ============================================================================

def generate_prompt(user_text: str, style: str = 'detailed', lang: str = 'uk') -> str:
    try:
        text = user_text.strip()
        if not text:
            return ''

        classification = DomainClassifier.classify(text)
        domain = classification['domain']
        
        # 1. Role Selection
        role = ExpertRoles.get_role(domain, lang)
        
        # 2. Research Principles
        research_principles = _build_research_principles(domain, lang)
        
        # 3. Research Objective
        research_objective = _build_research_objective(text, domain, lang)
        
        # 4. Scope Definition
        scope = _build_scope(domain, lang)
        
        # 5. Methodology
        methodology = Methodologies.get_methodology(domain, lang)
        if not methodology:
            methodology = Methodologies.get_general_methodology(lang)
        
        # 6. Information Requirements
        info_requirements = _build_information_requirements(domain, text, lang)
        
        # 7. Tasks
        tasks = _build_tasks(text, domain, lang)
        
        # 8. Deliverables
        deliverables = _build_deliverables(domain, lang)
        
        # 9. Quality Controls
        confidence = ConfidenceAssessor.assess(domain, {'text': text, 'domain': domain})
        hallucination_controls = AntiHallucinationControls.format_controls(domain, lang)
        bias_controls = _build_bias_controls(domain, lang)
        
        # 10. Output Format
        output_format = _build_output_format(domain, style, lang)
        
        # 11. Probability Yardstick (new)
        probability_yardstick = _build_probability_yardstick(domain, lang)
        
        # 12. Examples Clause (new)
        examples_clause = _build_examples_clause(domain, lang)
        
        # 13. Assemble Prompt
        prompt = _assemble_prompt(
            role=role,
            research_principles=research_principles,
            research_objective=research_objective,
            scope=scope,
            methodology=methodology,
            info_requirements=info_requirements,
            tasks=tasks,
            deliverables=deliverables,
            confidence=confidence,
            hallucination_controls=hallucination_controls,
            bias_controls=bias_controls,
            output_format=output_format,
            probability_yardstick=probability_yardstick,
            examples_clause=examples_clause,
            lang=lang,
            domain=domain
        )
        
        return _strip_emoji(prompt)
        
    except Exception:
        return user_text

def _build_research_principles(domain: str, lang: str) -> str:
    """Build research principles section."""
    uk = lang == 'uk'
    
    principles = {
        'uk': '''## Принципи дослідження
- **Об'єктивність**: Аналізувати факти без упереджень та викривлень
- **Доказовість**: Усі твердження підкріплювати доказами та джерелами
- **Прозорість**: Чітко розрізняти факти, оцінки, припущення та прогнози
- **Критичне мислення**: Систематично оцінювати докази та альтернативні інтерпретації
- **Етичність**: Дотримуватися професійних та етичних стандартів аналізу''',
        'en': '''## Research Principles
- **Objectivity**: Analyze facts without bias or distortion
- **Evidence-based**: All claims supported by evidence and sources
- **Transparency**: Clearly distinguish facts, assessments, assumptions, and forecasts
- **Critical Thinking**: Systematically evaluate evidence and alternative interpretations
- **Ethical Conduct**: Adhere to professional and ethical analysis standards'''
    }
    
    return principles.get('uk' if uk else 'en', principles.get('en', ''))

def _build_research_objective(text: str, domain: str, lang: str) -> str:
    """Build research objective section."""
    uk = lang == 'uk'
    
    template = {
        'uk': '''## Дослідницька мета

### Мета аналізу
{goal}

### Очікувані результати
- [Результат 1]
- [Результат 2]
- [Результат 3]

### Аналітичні межі
- [Обмеження 1]
- [Обмеження 2]
- [Обмеження 3]

### Критерії успіху
- [Критерій 1]
- [Критерій 2]
- [Критерій 3]''',
        'en': '''## Research Objective

### Analysis Goal
{goal}

### Expected Outputs
- [Output 1]
- [Output 2]
- [Output 3]

### Analytical Boundaries
- [Boundary 1]
- [Boundary 2]
- [Boundary 3]

### Success Criteria
- [Criteria 1]
- [Criteria 2]
- [Criteria 3]'''
    }
    
    goal = {
        'uk': f'Провести аналіз на основі наданого запиту: "{text[:200]}..." та отримати структуровані, доказові результати.',
        'en': f'Conduct analysis based on the provided request: "{text[:200]}..." and produce structured, evidence-based results.'
    }
    
    t = template.get('uk' if uk else 'en', template.get('en', ''))
    return t.format(goal=goal.get('uk' if uk else 'en', goal['en']))

def _build_scope(domain: str, lang: str) -> str:
    """Build scope definition section."""
    uk = lang == 'uk'
    
    scopes = {
        'intelligence_analysis': {
            'uk': '''## Обсяг аналізу
- **Географічні межі**: [Визначити географічний фокус]
- **Часові межі**: [Визначити період аналізу]
- **Тематичний фокус**: [Визначити основні теми]
- **Обмеження**: [Визначити обмеження аналізу]''',
            'en': '''## Scope of Analysis
- **Geographic Boundaries**: [Define geographic focus]
- **Temporal Boundaries**: [Define analysis period]
- **Thematic Focus**: [Define core themes]
- **Limitations**: [Define analysis limitations]'''
        },
        'medical_diagnostics': {
            'uk': '''## Обсяг діагностики
- **Клінічний контекст**: [Визначити клінічний контекст]
- **Діагностичні межі**: [Визначити межі діагностики]
- **Доступна інформація**: [Визначити доступну інформацію]
- **Обмеження**: [Визначити обмеження]''',
            'en': '''## Diagnostic Scope
- **Clinical Context**: [Define clinical context]
- **Diagnostic Boundaries**: [Define diagnostic boundaries]
- **Available Information**: [Define available information]
- **Limitations**: [Define limitations]'''
        },
        'cybersecurity': {
            'uk': '''## Обсяг оцінки безпеки
- **Системні межі**: [Визначити межі системи]
- **Тестові межі**: [Визначити межі тестування]
- **Методологічні межі**: [Визначити методологічні межі]
- **Обмеження**: [Визначити обмеження]''',
            'en': '''## Security Assessment Scope
- **System Boundaries**: [Define system boundaries]
- **Test Boundaries**: [Define testing boundaries]
- **Methodological Boundaries**: [Define methodological boundaries]
- **Limitations**: [Define limitations]'''
        }
    }
    
    default = {
        'uk': '''## Обсяг роботи
- **Основні напрямки**: [Визначити основні напрямки аналізу]
- **Межі аналізу**: [Визначити межі аналізу]
- **Обмеження**: [Визначити обмеження]''',
        'en': '''## Scope of Work
- **Core Directions**: [Define core analysis directions]
- **Analysis Boundaries**: [Define analysis boundaries]
- **Limitations**: [Define limitations]'''
    }
    
    scope = scopes.get(domain, default)
    return scope.get('uk' if uk else 'en', scope.get('en', ''))

def _build_tasks(text: str, domain: str, lang: str) -> str:
    """Build tasks section."""
    uk = lang == 'uk'
    
    template = {
        'uk': '''## Завдання

### Основні завдання
1. {task1}
2. {task2}
3. {task3}

### Додаткові завдання
- [Додаткове завдання 1]
- [Додаткове завдання 2]''',
        'en': '''## Tasks

### Primary Tasks
1. {task1}
2. {task2}
3. {task3}

### Additional Tasks
- [Additional Task 1]
- [Additional Task 2]'''
    }
    
    task_templates = {
        'intelligence_analysis': {
            'uk': 'Провести систематичний аналіз доступної інформації, застосовуючи ACH та Red Team методики.',
            'en': 'Conduct systematic analysis of available information using ACH and Red Team methodologies.'
        },
        'medical_diagnostics': {
            'uk': 'Провести диференційну діагностику на основі EBM принципів та клінічних настанов.',
            'en': 'Conduct differential diagnosis based on EBM principles and clinical guidelines.'
        }
    }
    
    default_task = {
        'uk': 'Провести комплексний аналіз наданої інформації та отримати структуровані результати.',
        'en': 'Conduct comprehensive analysis of provided information and produce structured results.'
    }
    
    tasks = task_templates.get(domain, {})
    task1 = tasks.get('uk' if uk else 'en', default_task.get('uk' if uk else 'en', default_task['en']))
    
    t = template.get('uk' if uk else 'en', template.get('en', ''))
    task2 = ('Застосувати методологію для отримання доказових висновків.' if uk
             else 'Apply the methodology to reach evidence-based conclusions.')
    task3 = ('Документувати всі джерела, припущення та обмеження.' if uk
             else 'Document all sources, assumptions and limitations.')
    return t.format(task1=task1, task2=task2, task3=task3)

def _build_deliverables(domain: str, lang: str) -> str:
    """Build deliverables section."""
    uk = lang == 'uk'
    
    template = {
        'uk': '''## Результати

### Основний звіт
1. **Executive Summary** (1-2 сторінки)
2. **Детальний аналіз** з доказами та джерелами
3. **Висновки та рекомендації**

### Додаткові матеріали
- Таблиці, графіки, візуалізації (за потреби)
- Документація джерел та методології
- Альтернативні сценарії та аналіз чутливості''',
        'en': '''## Deliverables

### Main Report
1. **Executive Summary** (1-2 pages)
2. **Detailed Analysis** with evidence and sources
3. **Conclusions and Recommendations**

### Additional Materials
- Tables, charts, visualizations (as needed)
- Source and methodology documentation
- Alternative scenarios and sensitivity analysis'''
    }
    
    return template.get('uk' if uk else 'en', template.get('en', ''))

def _build_probability_yardstick(domain: str, lang: str) -> str:
    """Build Probability Yardstick section — only for analytical domains."""
    analytical_domains = [
        'intelligence_analysis', 'osint', 'strategic_risk',
        'financial_analysis', 'medical_diagnostics', 'legal_analysis',
        'scientific_research'
    ]
    if domain not in analytical_domains:
        return ''

    uk = lang == 'uk'
    if uk:
        return '''## Шкала ймовірностей (Probability Yardstick)

Використовуй ЛИШЕ ці стандартизовані формулювання для всіх оцінок ймовірності:

| Термін | Ймовірність | Коли використовувати |
|--------|-------------|----------------------|
| **Майже напевно** | >95% | Фактично неминуче за наявними даними |
| **Дуже ймовірно** | 85–95% | Сильні, послідовні докази |
| **Ймовірно** | 60–84% | Докази переважно на користь |
| **Приблизно рівні шанси** | 40–60% | Докази врівноважені або суперечливі |
| **Малоймовірно** | 15–39% | Докази переважно проти |
| **Дуже малоймовірно** | 5–14% | Сильні докази проти |
| **Майже неможливо** | <5% | Фактично виключено |

**Правило трейсабільності**: кожна оцінка ймовірності ПОВИННА супроводжуватися:
1. Посиланням на джерело або доказ (Source: [назва])
2. Рівнем достовірності джерела (High / Moderate / Low)
3. Ключовим припущенням, на якому ґрунтується оцінка
4. Зазначенням, як зміна припущення вплине на ймовірність'''
    else:
        return '''## Probability Yardstick

Use ONLY these standardized terms for ALL probability assessments:

| Term | Probability | When to use |
|------|-------------|-------------|
| **Almost certainly** | >95% | Virtually inevitable given available evidence |
| **Highly likely** | 85–95% | Strong, consistent evidence |
| **Likely** | 60–84% | Evidence predominantly supports |
| **About even odds** | 40–60% | Balanced or conflicting evidence |
| **Unlikely** | 15–39% | Evidence predominantly against |
| **Highly unlikely** | 5–14% | Strong evidence against |
| **Almost certainly not** | <5% | Virtually ruled out |

**Traceability rule**: every probability assessment MUST include:
1. Source or evidence reference (Source: [name])
2. Source reliability level (High / Moderate / Low)
3. The key assumption underlying the estimate
4. How a change in the assumption would shift the probability'''


def _build_examples_clause(domain: str, lang: str) -> str:
    """Build domain-specific Examples Clause with 2 concrete output examples."""
    uk = lang == 'uk'

    examples = {
        'intelligence_analysis': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — правильне зазначення факту з джерелом:**
> "За даними Reuters від 14 червня 2025 р. (Source: Reuters, Moderate reliability), угруповання X перемістило не менше 3 батальйонів у напрямку Y. **Оцінка**: Ймовірно (65–70%), що це є підготовкою до наступальної операції протягом 30 днів. **Ключове припущення**: збереження поточного темпу постачання."

**Приклад 2 — правильне зазначення невизначеності:**
> "Інформація щодо намірів командування є суперечливою між джерелами A і B. **Рівень достовірності**: Low. **Вплив на аналіз**: знижує впевненість у Сценарії 2 з 'Ймовірно' до 'Приблизно рівні шанси'. **Рекомендовано**: збір додаткових даних із джерела C для верифікації."''',
            'en': '''## Examples of Quality Output

**Example 1 — correct fact with source citation:**
> "According to Reuters, June 14 2025 (Source: Reuters, Moderate reliability), group X relocated at least 3 battalions toward Y. **Assessment**: Likely (65–70%) this constitutes preparation for an offensive operation within 30 days. **Key assumption**: current supply tempo is maintained."

**Example 2 — correct uncertainty disclosure:**
> "Intelligence regarding command intent is conflicting between sources A and B. **Reliability level**: Low. **Analytical impact**: reduces confidence in Scenario 2 from 'Likely' to 'About even odds'. **Recommended**: collect additional data from source C for verification."'''
        },
        'osint': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — верифікація з перехресними джерелами:**
> "Геолокація підтверджена трьома незалежними джерелами: супутниковий знімок (Maxar, High reliability), публікація в соцмережах з геотегом (Moderate), показання очевидця (Low). **Підсумковий рівень достовірності**: Moderate. **Залишкова невизначеність**: точний час події не верифіковано."

**Приклад 2 — документування методу:**
> "Використані інструменти: Google Earth (версія координат X,Y,Z), Wayback Machine (знімок від дати D), TinEye для зворотного пошуку зображень. Всі кроки задокументовані з timestamp та скріншотами."''',
            'en': '''## Examples of Quality Output

**Example 1 — verification with cross-sources:**
> "Geolocation confirmed by three independent sources: satellite image (Maxar, High reliability), geotagged social post (Moderate), eyewitness account (Low). **Combined reliability**: Moderate. **Residual uncertainty**: exact event time not verified."

**Example 2 — method documentation:**
> "Tools used: Google Earth (coordinate version X,Y,Z), Wayback Machine (snapshot dated D), TinEye for reverse image search. All steps documented with timestamps and screenshots."'''
        },
        'strategic_risk': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — сценарний аналіз:**
> "Сценарій A (Базовий, Ймовірно — 55%): статус-кво зберігається протягом 90 днів. Ключові індикатори: [перелік]. Сценарій B (Погіршення, Малоймовірно — 25%): ескалація через тригер X. **Рекомендований тригер для перегляду**: якщо індикатор Y перевищить поріг Z."

**Приклад 2 — ризик-матриця:**
> "Ризик: зупинка ланцюга постачання. **Ймовірність**: Малоймовірно (20%). **Вплив**: Critical (втрата >30% виробництва). **Пріоритет**: HIGH. **Рекомендація**: диверсифікація постачальника до Q3."''',
            'en': '''## Examples of Quality Output

**Example 1 — scenario analysis:**
> "Scenario A (Baseline, Likely — 55%): status quo maintained for 90 days. Key indicators: [list]. Scenario B (Deterioration, Unlikely — 25%): escalation via trigger X. **Recommended review trigger**: if indicator Y exceeds threshold Z."

**Example 2 — risk matrix entry:**
> "Risk: supply chain halt. **Probability**: Unlikely (20%). **Impact**: Critical (>30% production loss). **Priority**: HIGH. **Recommendation**: supplier diversification by Q3."'''
        },
        'medical_diagnostics': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — диференційний діагноз з рівнями доказовості:**
> "Найімовірніший діагноз: гострий апендицит (Grade A, на підставі RCT-даних — Alvarado score ≥7, чутливість 82%). Диференціал: оваріальна киста з торсією (Grade B, когортні дослідження). **Червоні прапорці**: перитонеальні симптоми — негайна консультація хірурга."

**Приклад 2 — правильне зазначення обмежень:**
> "Ця відповідь носить інформаційний характер і не замінює очну консультацію лікаря. Рівень доказовості: Grade B. Необхідні дослідження для остаточного діагнозу: OAK, УЗД черевної порожнини, огляд хірурга."''',
            'en': '''## Examples of Quality Output

**Example 1 — differential diagnosis with evidence levels:**
> "Most probable: acute appendicitis (Grade A, RCT-based — Alvarado score ≥7, sensitivity 82%). Differential: ovarian cyst with torsion (Grade B, cohort studies). **Red flags**: peritoneal signs — immediate surgical consultation."

**Example 2 — correct limitation disclosure:**
> "This response is informational and does not replace in-person medical consultation. Evidence level: Grade B. Required for definitive diagnosis: CBC, abdominal ultrasound, surgical examination."'''
        },
        'cybersecurity': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — вразливість з CVSS:**
> "Виявлена вразливість: SQL Injection у /api/users (CVSS 9.1 — Critical). **Доказ**: blind SQLi через параметр 'id', підтверджено Burp Suite Pro. **Вектор**: Network/Low complexity/No privileges. **Рекомендація**: parameterized queries + WAF rule + patch до 48 годин."

**Приклад 2 — документування scope:**
> "Аналіз проведено виключно в межах узгодженого scope (IP-діапазон X.X.X.0/24, дата: DD.MM.YYYY). Позаscope системи не тестувалися. Всі дії задокументовані з timestamp та hash доказів."''',
            'en': '''## Examples of Quality Output

**Example 1 — vulnerability with CVSS:**
> "Identified: SQL Injection in /api/users (CVSS 9.1 — Critical). **Evidence**: blind SQLi via 'id' parameter, confirmed via Burp Suite Pro. **Vector**: Network/Low complexity/No privileges. **Recommendation**: parameterized queries + WAF rule + patch within 48h."

**Example 2 — scope documentation:**
> "Analysis conducted exclusively within agreed scope (IP range X.X.X.0/24, date: DD.MM.YYYY). Out-of-scope systems not tested. All actions documented with timestamps and evidence hashes."'''
        },
        'financial_analysis': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — оцінка з явними припущеннями:**
> "DCF-оцінка: $42–48/акція (Base case, WACC=9.5%, Terminal growth=2.5%). Bull case ($55): WACC=8% при розширенні ринку на 15%. Bear case ($32): стиснення маржі на 200 bps. **Чутливість**: зміна WACC на 1% → зміна оцінки на ±$7."

**Приклад 2 — правильне зазначення ризиків:**
> "Ця відповідь є аналітичною, не є інвестиційною рекомендацією. Ключові ризики: регуляторні зміни (High impact, Малоймовірно — 20%), валютний ризик (Moderate impact, Ймовірно — 65%)."''',
            'en': '''## Examples of Quality Output

**Example 1 — valuation with explicit assumptions:**
> "DCF: $42–48/share (Base case, WACC=9.5%, Terminal growth=2.5%). Bull ($55): WACC=8% with 15% market expansion. Bear ($32): 200bps margin compression. **Sensitivity**: 1% WACC shift → ±$7 valuation."

**Example 2 — risk disclosure:**
> "This is analytical only, not an investment recommendation. Key risks: regulatory change (High impact, Unlikely — 20%), FX risk (Moderate impact, Likely — 65%)."'''
        },
        'legal_analysis': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — аналіз з посиланням на норму:**
> "Відповідно до ст. 651 ЦКУ (юрисдикція: Україна), одностороннє розірвання договору можливе у разі істотного порушення. **Оцінка**: Ймовірно (70%), що затримка понад 30 днів кваліфікується як істотне порушення за прецедентом справи X v. Y (2019)."

**Приклад 2 — застереження:**
> "Ця відповідь є інформаційною і не є юридичною консультацією. Для конкретної справи необхідна консультація кваліфікованого адвоката, ознайомленого з деталями ситуації."''',
            'en': '''## Examples of Quality Output

**Example 1 — analysis with statute reference:**
> "Per Art. 651 CCU (jurisdiction: Ukraine), unilateral contract termination is possible upon material breach. **Assessment**: Likely (70%) that a delay exceeding 30 days qualifies as material breach per precedent X v. Y (2019)."

**Example 2 — disclaimer:**
> "This response is informational and does not constitute legal advice. For your specific matter, consult a qualified attorney familiar with the details of your situation."'''
        },
        'programming': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — відповідь на кодовий запит:**
> "Вибрано підхід: binary search O(log n) замість linear scan O(n) — обґрунтування: масив відсортований. Edge cases: порожній масив → return -1, один елемент → пряме порівняння. Складність: Time O(log n), Space O(1)."

**Приклад 2 — trade-off аналіз:**
> "Варіант A (Redis): latency <5ms, персистентність, складність деплою — середня. Варіант B (in-memory Map): latency <1ms, не персистентний. **Рекомендація для production**: Redis з TTL=300s і sentinel для HA."''',
            'en': '''## Examples of Quality Output

**Example 1 — code solution:**
> "Chosen: binary search O(log n) over linear scan O(n) — rationale: array is sorted. Edge cases: empty → return -1, single element → direct compare. Complexity: Time O(log n), Space O(1)."

**Example 2 — trade-off analysis:**
> "Option A (Redis): latency <5ms, persistent, moderate deploy complexity. Option B (in-memory Map): latency <1ms, not persistent. **Production recommendation**: Redis with TTL=300s and sentinel for HA."'''
        },
        'scientific_research': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — формулювання гіпотези:**
> "H0: застосування методу X не впливає на результат Y (α=0.05). H1: метод X збільшує Y на ≥15%. **Необхідна вибірка**: n=84 (потужність 0.80, двостороній t-test). **Ризик зміщення**: selection bias через нерандомізований набір."

**Приклад 2 — розрізнення кореляції та причинності:**
> "Спостерігається кореляція між X і Y (r=0.72, p<0.01). **Причинно-наслідковий зв'язок не встановлений**: відсутні RCT-дані, можливі конфаундери A і B. **Рекомендовано**: проспективне дослідження з рандомізацією."''',
            'en': '''## Examples of Quality Output

**Example 1 — hypothesis formulation:**
> "H0: method X has no effect on outcome Y (α=0.05). H1: method X increases Y by ≥15%. **Required sample**: n=84 (power 0.80, two-tailed t-test). **Bias risk**: selection bias from non-randomized recruitment."

**Example 2 — correlation vs causation:**
> "Correlation observed between X and Y (r=0.72, p<0.01). **Causality not established**: no RCT data, possible confounders A and B. **Recommended**: prospective randomized study."'''
        },
        'data_science': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — вибір метрики:**
> "Вибрано F1-score (а не Accuracy) — обґрунтування: незбалансовані класи (ratio 1:12). Baseline: dummy classifier F1=0.08. Target: F1≥0.75. **Ризик**: overfitting при малій вибірці; обов'язкове 5-fold CV."

**Приклад 2 — документування EDA:**
> "Missing values: 12% у колонці X — стратегія: median imputation (обґрунтування: розподіл не нормальний, KS-test p=0.003). Outliers: видалено 0.8% за IQR-правилом. Feature importance: SHAP-значення задокументовані."''',
            'en': '''## Examples of Quality Output

**Example 1 — metric selection:**
> "Chosen F1-score (not Accuracy) — rationale: imbalanced classes (1:12 ratio). Baseline dummy classifier F1=0.08. Target: F1≥0.75. **Risk**: overfitting on small sample; mandatory 5-fold CV."

**Example 2 — EDA documentation:**
> "Missing values: 12% in column X — strategy: median imputation (rationale: non-normal distribution, KS-test p=0.003). Outliers: 0.8% removed via IQR rule. Feature importance: SHAP values documented."'''
        },
        'business_strategy': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — стратегічний аналіз:**
> "SWOT: Strength — патентований продукт (бар'єр входу: High). Weakness — концентрація доходів (топ-3 клієнти = 68%). Opportunity — TAM зростає 18% YoY. Threat — вхід конкурента X (Ймовірно — 60% протягом 18 міс)."

**Приклад 2 — оцінка альтернатив:**
> "Альтернатива A (органічне зростання): IRR=22%, ризик — Moderate. Альтернатива B (M&A): IRR=31%, ризик — High (інтеграційний). **Рекомендація**: A як base case, B — за умови залучення фінансування до Q2."''',
            'en': '''## Examples of Quality Output

**Example 1 — strategic analysis:**
> "SWOT: Strength — patented product (entry barrier: High). Weakness — revenue concentration (top-3 clients = 68%). Opportunity — TAM growing 18% YoY. Threat — competitor X entry (Likely — 60% within 18mo)."

**Example 2 — alternative evaluation:**
> "Option A (organic growth): IRR=22%, risk Moderate. Option B (M&A): IRR=31%, risk High (integration). **Recommendation**: A as base case, B contingent on Q2 financing."'''
        },
        'product_management': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — пріоритезація фіч:**
> "Feature X: RICE score = (Reach 500 × Impact 3 × Confidence 0.8) / Effort 4 = 300. Feature Y: RICE=180. **Рекомендація**: Feature X у наступний sprint. **Ризик**: dependency на backend API v2 — підтвердити готовність до DD.MM."

**Приклад 2 — формулювання user story:**
> "Як [тип користувача], я хочу [дію], щоб [цінність/мета]. **Acceptance criteria**: (1) [умова 1], (2) [умова 2], (3) [умова 3]. **Definition of Done**: unit tests покривають 80%+, QA approved."''',
            'en': '''## Examples of Quality Output

**Example 1 — feature prioritization:**
> "Feature X: RICE = (Reach 500 × Impact 3 × Confidence 0.8) / Effort 4 = 300. Feature Y: RICE=180. **Recommendation**: Feature X in next sprint. **Risk**: dependency on backend API v2 — confirm readiness by DD.MM."

**Example 2 — user story:**
> "As a [user type], I want to [action], so that [value/goal]. **Acceptance criteria**: (1) [condition 1], (2) [condition 2], (3) [condition 3]. **Definition of Done**: unit tests ≥80% coverage, QA approved."'''
        },
        'general': {
            'uk': '''## Приклади якісного виводу

**Приклад 1 — структурована відповідь:**
> "**Контекст**: [коротко сформулюй суть проблеми та обмеження]. **Аналіз**: [ключові факти з джерелами або обґрунтуванням]. **Рекомендація**: [конкретна дія з обґрунтуванням та пріоритетом]. **Обмеження**: [що невідомо або поза scope]."

**Приклад 2 — зазначення невизначеності:**
> "Дані щодо X суперечливі в доступних джерелах. Висновок базується на джерелах A і B (Moderate reliability). Для підвищення впевненості рекомендую верифікувати через [джерело]. Ключове припущення: [припущення]."''',
            'en': '''## Examples of Quality Output

**Example 1 — structured response:**
> "**Context**: [state the problem and constraints briefly]. **Analysis**: [key facts with sources or rationale]. **Recommendation**: [specific action with rationale and priority]. **Limitations**: [what is unknown or out of scope]."

**Example 2 — uncertainty disclosure:**
> "Data on X is conflicting across available sources. Conclusion is based on sources A and B (Moderate reliability). To increase confidence, recommend verification via [source]. Key assumption: [assumption]."'''
        }
    }

    entry = examples.get(domain, examples['general'])
    key = 'uk' if uk else 'en'
    return entry.get(key, entry.get('en', ''))


def _assemble_prompt(role: str, research_principles: str, research_objective: str,
                     scope: str, methodology: str, info_requirements: str,
                     tasks: str, deliverables: str, confidence: Dict,
                     hallucination_controls: str, bias_controls: str,
                     output_format: str, probability_yardstick: str,
                     examples_clause: str, lang: str, domain: str) -> str:
    
    labels = {
        'title': {'uk': 'Аналітичний промт', 'en': 'Analytical Prompt'},
        'role': {'uk': 'Роль та експертиза', 'en': 'Role & Expertise'},
        'principles': {'uk': 'Принципи дослідження', 'en': 'Research Principles'},
        'objective': {'uk': 'Дослідницька мета', 'en': 'Research Objective'},
        'scope': {'uk': 'Обсяг роботи', 'en': 'Scope of Work'},
        'methodology': {'uk': 'Методологія', 'en': 'Methodology'},
        'info_requirements': {'uk': 'Інформаційні вимоги', 'en': 'Information Requirements'},
        'tasks': {'uk': 'Завдання', 'en': 'Tasks'},
        'deliverables': {'uk': 'Результати', 'en': 'Deliverables'},
        'quality': {'uk': 'Контроль якості', 'en': 'Quality Assurance'},
        'output': {'uk': 'Формат виводу', 'en': 'Output Format'}
    }
    
    def t(k): return labels[k].get(lang, labels[k]['en'])
    
    confidence_section = f"""
## Confidence Assessment
- **Level**: {confidence['level']}
- **Rationale**: {confidence['rationale']}
- **Criteria**: 
{chr(10).join(f"  - {c}" for c in confidence['criteria'])}
"""
    
    prompt = f"""# {t('title')}

## {t('role')}
{role}

{research_principles}

{research_objective}

{scope}

{methodology}

{info_requirements}

{tasks}

{deliverables}

## Quality Controls
{hallucination_controls}

{bias_controls}

{confidence_section}

{probability_yardstick}

## {t('output')}
{output_format}

{examples_clause}
"""
    
    return prompt

def _build_output_format(domain: str, style: str, lang: str) -> str:
    uk = lang == 'uk'
    
    formats = {
        'intelligence_analysis': {
            'uk': '''
### Основний звіт
1. **Executive Summary** — ключові висновки (1-2 абзаци)
2. **Current Context** — поточний стан та обстановка
3. **Threat/Assessment** — оцінка загроз з Confidence Levels (High/Moderate/Low)
4. **Scenario Matrix** — сценарії A/B/C/D з ймовірностями
5. **Risk Matrix** — ймовірність × вплив
6. **Forecast** — прогноз на 3/6/12 місяців
7. **Information Gaps** — ключові прогалини в інформації
8. **Sources & Methodology** — джерела та застосована методологія
9. **Recommendations** — рекомендації та наступні кроки

### Додаткові матеріали
- Таблиці, графіки, візуалізації
- Документація джерел
- Альтернативні сценарії''',
            'en': '''
### Main Report
1. **Executive Summary** — key findings (1-2 paragraphs)
2. **Current Context** — current state and environment
3. **Threat/Assessment** — threat assessment with Confidence Levels (High/Moderate/Low)
4. **Scenario Matrix** — scenarios A/B/C/D with probabilities
5. **Risk Matrix** — probability × impact
6. **Forecast** — 3/6/12 month forecast
7. **Information Gaps** — key information gaps
8. **Sources & Methodology** — sources and applied methodology
9. **Recommendations** — recommendations and next steps

### Additional Materials
- Tables, charts, visualizations
- Source documentation
- Alternative scenarios'''
        },
        'medical_diagnostics': {
            'uk': '''
1. **Клінічний портрет** — систематизований опис симптомів та стану
2. **Диференційна діагностика** — гіпотези з рівнями доказовості (Grade A/B/C)
3. **Рекомендовані дослідження** — діагностичний план
4. **Тактика лікування** — з обґрунтуванням на основі EBM
5. **Red Flags** — критичні симптоми, що потребують негайної допомоги
6. **Прогноз** — очікувані результати
7. **Рекомендації** — конкретні дії та подальше спостереження
8. **Застереження** — інформація не замінює консультацію лікаря''',
            'en': '''
1. **Clinical Profile** — systematized symptom and condition description
2. **Differential Diagnosis** — hypotheses with evidence levels (Grade A/B/C)
3. **Recommended Investigations** — diagnostic plan
4. **Treatment Approach** — EBM-based justification
5. **Red Flags** — critical symptoms requiring immediate attention
6. **Prognosis** — expected outcomes
7. **Recommendations** — specific actions and follow-up
8. **Disclaimer** — information does not replace medical consultation'''
        }
    }
    
    default = {
        'uk': '''
1. **Вступ** — контекст та проблема
2. **Аналіз** — детальний розгляд з ключовими висновками
3. **Рекомендації** — практичні кроки з пріоритетами
4. **Висновки** — підсумок та наступні кроки

**Форматування**: Markdown (## для розділів, ### для підрозділів, **жирний** для ключових термінів, - для списків)''',
        'en': '''
1. **Introduction** — context and problem
2. **Analysis** — detailed examination with key findings
3. **Recommendations** — prioritized practical steps
4. **Conclusions** — summary and next steps

**Formatting**: Markdown (## sections, ### subsections, **bold** for key terms, - for lists)'''
    }
    
    fmt = formats.get(domain, default)
    return fmt.get('uk' if uk else 'en', fmt.get('en', ''))

# ============================================================================
# LEGACY FUNCTIONS (Maintained for backward compatibility)
# ============================================================================

def postprocess_text(text):
    try:
        text = _safe_re_sub(r'([a-zA-Zа-яіїєґА-ЯІЇЄҐ])-\\n([a-zа-яіїєґ])', r'\\1\\2', text)
        text = _safe_re_sub(r'\\n{3,}', '\\n\\n', text)
        lines = [l.rstrip() for l in text.split('\\n')]
        lines = [l for l in lines if not _safe_re_match(r'^\\s*\\d{1,4}\\s*$', l)]
        return '\\n'.join(lines).strip()
    except Exception:
        return text

def count_claude_tokens(text):
    if not text:
        return 0
    try:
        uk = len(_safe_re_findall(r'[а-яіїєґА-ЯІЇЄҐ]', text))
        en = len(_safe_re_findall(r'[a-zA-Z]', text))
        oth = len(text) - uk - en
        return max(int((uk/2.8 + en/4.0 + oth/3.0) * 1.1), 1)
    except Exception:
        return max(len(text) // 3, 1)

# PDF/DOCX conversion functions (maintained from original)
try:
    from pypdf import PdfReader
    _PYPDF_OK = True
except ImportError:
    _PYPDF_OK = False
    PdfReader = None

try:
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import (
        LTPage, LTTextBox, LTTextLine, LTChar, LTAnon,
        LTFigure, LTImage, LTRect, LTLine, LAParams
    )
    _PDFMINER_OK = True
except ImportError:
    _PDFMINER_OK = False

try:
    from PIL import Image as PILImage
    _PILLOW_OK = True
except ImportError:
    _PILLOW_OK = False

try:
    from docx import Document
    from docx.oxml.ns import qn
    _DOCX_OK = True
except ImportError:
    _DOCX_OK = False
    Document = None
    qn = None

WORD_GAP_FACTOR = 0.18
LINE_GAP_FACTOR = 0.08

def _chars_to_text(ltline):
    try:
        chars = [ch for ch in ltline if isinstance(ch, LTChar)]
        if not chars:
            return '', 0.0, False

        tokens = []
        sizes = []
        bold_ct = 0

        prev_x1 = chars[0].x0
        prev_size = chars[0].size or 10

        for ch in chars:
            try:
                c = ch.get_text() or ''
            except Exception:
                c = ''
            sz = ch.size or prev_size
            gap = ch.x0 - prev_x1

            if gap > sz * WORD_GAP_FACTOR:
                tokens.append(' ')
            elif gap > sz * LINE_GAP_FACTOR and tokens and tokens[-1] != ' ':
                tokens.append(' ')

            if c:
                tokens.append(c)
            sizes.append(sz)

            try:
                fn = (ch.fontname or '').lower()
                if 'bold' in fn or 'heavy' in fn or 'black' in fn:
                    bold_ct += 1
            except Exception:
                pass

            prev_x1 = ch.x1
            prev_size = sz

        text = ''.join(tokens)
        text = _safe_re_sub(r'[ \\t]{2,}', ' ', text)
        text = ''.join(c for c in text if ord(c) >= 32 or ord(c) in (9, 10, 13))
        text = text.strip()

        avg_size = sum(sizes) / len(sizes) if sizes else 0.0
        is_bold = bold_ct / max(len(chars), 1) > 0.5

        return text, avg_size, is_bold
    except Exception:
        return '', 0.0, False

def _textbox_to_lines(tb):
    try:
        raw_lines = []
        for ltline in tb:
            if not isinstance(ltline, LTTextLine):
                continue
            text, sz, bold = _chars_to_text(ltline)
            if text:
                raw_lines.append((text, sz, bold))

        merged = []
        i = 0
        while i < len(raw_lines):
            text, sz, bold = raw_lines[i]
            while text.endswith('-') and i + 1 < len(raw_lines):
                next_text, next_sz, next_bold = raw_lines[i + 1]
                if next_text and next_text[0].islower():
                    text = text[:-1] + next_text
                    i += 1
                else:
                    break
            merged.append((text, sz, bold))
            i += 1

        return merged
    except Exception:
        return []

def _heading_level(size, bold):
    if size >= 20: return 1
    if size >= 16: return 2
    if size >= 13: return 3
    if size >= 11 and bold: return 4
    return 0

def _is_page_number(text):
    try:
        t = text.strip()
        return bool(_safe_re_match(r'^-?\\s*\\d{1,4}\\s*-?$', t)) or t in ('', '-', '–', '—')
    except Exception:
        return False

def _clean(text):
    return _clean_text(text)

_LIST_CHARS = ''.join(chr(c) for c in [0x2022,0x2023,0x2043,0x2013,0x2014,0x25cf,0x25aa,0x2219,45,42])
LIST_RE = re.compile('^[-' + re.escape(''.join(chr(c) for c in [0x2022,0x2023,0x2043,0x2013,0x2014,0x25cf,0x25aa,0x2219,42])) + ']' + r'[ \\t]+|^\\d+[.)][ \\t]+')

def _safe_list_match(text):
    try:
        return bool(LIST_RE.match(text))
    except Exception:
        return False

def _safe_list_sub(text):
    try:
        return LIST_RE.sub('', text)
    except Exception:
        return text

def _reorder_columns(textboxes, page_width):
    try:
        if len(textboxes) <= 3:
            return textboxes

        xs = sorted(tb.x0 for tb in textboxes)
        col_gap = page_width * 0.10

        clusters = [[xs[0]]]
        for x in xs[1:]:
            if x - clusters[-1][-1] < col_gap:
                clusters[-1].append(x)
            else:
                clusters.append([x])

        if len(clusters) < 2:
            return sorted(textboxes, key=lambda tb: -tb.y1)

        col_anchors = sorted(sum(c) / len(c) for c in clusters)

        cols = {i: [] for i in range(len(col_anchors))}
        for tb in textboxes:
            ci = min(range(len(col_anchors)), key=lambda i: abs(col_anchors[i] - tb.x0))
            cols[ci].append(tb)

        ordered = []
        for ci in sorted(cols.keys()):
            ordered.extend(sorted(cols[ci], key=lambda tb: -tb.y1))
        return ordered
    except Exception:
        return textboxes

def _detect_tables_in_page(textboxes, page_width):
    try:
        if len(textboxes) < 4:
            return []

        rows = {}
        for tb in textboxes:
            y = round(tb.y1 / 5) * 5
            rows.setdefault(y, []).append(tb)

        row_list = [v for v in rows.values() if len(v) >= 2]
        if len(row_list) < 2:
            return []

        all_x0 = [tb.x0 for row in row_list for tb in row]
        all_x0.sort()
        col_clusters = [[all_x0[0]]]
        for x in all_x0[1:]:
            if x - col_clusters[-1][-1] < 15:
                col_clusters[-1].append(x)
            else:
                col_clusters.append([x])

        col_anchors = [sum(c)/len(c) for c in col_clusters if len(c) >= 2]
        if len(col_anchors) < 2:
            return []

        table_rows = []
        for row_tbs in sorted(row_list, key=lambda r: -r[0].y1):
            cells = [''] * len(col_anchors)
            for tb in row_tbs:
                ci = min(range(len(col_anchors)), key=lambda i: abs(col_anchors[i] - tb.x0))
                text = ' '.join(
                    t for t, _, _ in _textbox_to_lines(tb)
                ).strip().replace('|', '/')
                cells[ci] = text
            if any(c.strip() for c in cells):
                table_rows.append(cells)

        if len(table_rows) < 2:
            return []

        filled = sum(1 for r in table_rows for c in r if c.strip())
        total = len(table_rows) * len(col_anchors)
        return table_rows if filled / max(total, 1) >= 0.35 else []
    except Exception:
        return []

def _table_to_md(rows):
    try:
        if not rows:
            return []
        w = len(rows[0])
        out = ['', '| ' + ' | '.join(rows[0]) + ' |',
                   '| ' + ' | '.join('---' for _ in range(w)) + ' |']
        for row in rows[1:]:
            row = (row + [''] * w)[:w]
            out.append('| ' + ' | '.join(row) + ' |')
        out.append('')
        return out
    except Exception:
        return []

def _page_to_md_pdfminer(page_layout, page_num, total_pages):
    try:
        md = []
        if total_pages > 1:
            md += [f'## Page {page_num}', '']

        textboxes = [el for el in page_layout if isinstance(el, LTTextBox)]
        if not textboxes:
            return md

        page_w = page_layout.width or 595
        ordered = _reorder_columns(textboxes, page_w)

        tables = _detect_tables_in_page(textboxes, page_w)

        for tb in ordered:
            lines = _textbox_to_lines(tb)
            if not lines:
                continue

            all_sizes = [sz for _, sz, _ in lines if sz]
            all_bolds = [b for _, _, b in lines]
            box_size = max(all_sizes) if all_sizes else 0
            box_bold = sum(all_bolds) / max(len(all_bolds), 1) > 0.5

            full_text = ' '.join(t for t, _, _ in lines if t)
            full_text = _clean(full_text)

            if not full_text or _is_page_number(full_text):
                continue

            level = _heading_level(box_size, box_bold)
            is_list = _safe_list_match(full_text)

            if level >= 1:
                md.append('#' * level + ' ' + full_text)
            elif is_list:
                cleaned = _safe_list_sub(full_text)
                if _safe_re_match(r'^\\d', full_text):
                    md.append(full_text)
                else:
                    md.append('- ' + cleaned)
            else:
                md.append(full_text)

            md.append('')

        if tables:
            md += _table_to_md(tables)

        return md
    except Exception:
        return []

def _page_fallback_pypdf(page, page_num, total_pages):
    try:
        md = []
        if total_pages > 1:
            md += [f'## Page {page_num}', '']

        try:
            text = page.extract_text(
                extraction_mode='layout',
                layout_mode_space_vertically=False,
            ) or ''
        except Exception:
            text = page.extract_text() or ''

        for line in text.split('\\n'):
            line = _clean(line)
            if not line or _is_page_number(line):
                continue
            if line.isupper() and 2 <= len(line.split()) <= 8:
                md.append('## ' + line.title())
            else:
                md.append(line)

        md.append('')
        return md
    except Exception:
        return []

def pdf_to_md(file_bytes, filename):
    if not _PYPDF_OK:
        return "**Error**: pypdf package not installed. Please use the Converter tab to trigger installation."
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        total = len(reader.pages)
        base_name = _safe_re_sub(r'\\.pdf$', '', filename, flags=re.IGNORECASE)

        md_out = [
            f'# {base_name}', '',
            f'> Converted from PDF  •  {datetime.now().strftime("%Y-%m-%d %H:%M")}',
            f'> Pages: {total}', '',
        ]

        scanned_pages = []

        if _PDFMINER_OK:
            try:
                laparams = LAParams(
                    line_overlap=0.3,
                    char_margin=0.3,
                    line_margin=0.5,
                    word_margin=0.1,
                    boxes_flow=0.5,
                    detect_vertical=False,
                    all_texts=True,
                )
            except Exception:
                laparams = None

            try:
                if laparams:
                    page_layouts = list(extract_pages(
                        io.BytesIO(file_bytes), laparams=laparams
                    ))
                else:
                    page_layouts = list(extract_pages(io.BytesIO(file_bytes)))
            except Exception:
                page_layouts = []

            for page_num, page_layout in enumerate(page_layouts, 1):
                try:
                    textboxes = [el for el in page_layout if isinstance(el, LTTextBox)]
                    total_chars = sum(
                        1 for tb in textboxes
                        for line in tb
                        if isinstance(line, LTTextLine)
                        for ch in line
                        if isinstance(ch, LTChar)
                    )

                    if total_chars < 20:
                        scanned_pages.append(page_num)
                        pg = reader.pages[page_num - 1]
                        md_out += _page_fallback_pypdf(pg, page_num, total)
                        if total > 1:
                            md_out.append(
                                f'> *Page {page_num}: scanned image — '
                                f'text extraction limited*'
                            )
                            md_out.append('')
                        continue

                    page_md = _page_to_md_pdfminer(page_layout, page_num, total)
                    md_out += page_md
                except Exception:
                    continue

        else:
            for i, page in enumerate(reader.pages, 1):
                md_out += _page_fallback_pypdf(page, i, total)

        if scanned_pages:
            md_out += [
                '', '---',
                f'> **OCR Notice:** Pages {scanned_pages} appear to be scanned images.',
                '> For best results, pre-process with Adobe Acrobat OCR,',
                '> ABBYY FineReader, or Google Drive (File → Open with Google Docs)',
                '> to add a text layer, then re-export and re-upload the PDF.',
                '',
            ]

        return postprocess_text('\\n'.join(md_out))
    except Exception as e:
        return f'# PDF Conversion Error\\n\\n> Error: {str(e)}\\n\\nPlease try again with a different PDF file.'

# ══════════════════════════════════════════════════════════════
# DOCX → Markdown converter
# Parses the OOXML package directly (zipfile + ElementTree, stdlib only):
# headings (styles + outline levels), real list numbering, inline formatting
# with run merging, hyperlinks (incl. field hyperlinks), internal anchors,
# footnotes/endnotes, tables (GFM, or linearized for layout tables), code
# blocks, quotes, images, text boxes, equations (OMML → LaTeX), tracked changes.
# ══════════════════════════════════════════════════════════════
import zipfile as _dx_zip
import posixpath as _dx_pp
import xml.etree.ElementTree as _dx_ET

_DX_NS = {
    'w':   'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r':   'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'm':   'http://schemas.openxmlformats.org/officeDocument/2006/math',
    'wp':  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a':   'http://schemas.openxmlformats.org/drawingml/2006/main',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'mc':  'http://schemas.openxmlformats.org/markup-compatibility/2006',
    'v':   'urn:schemas-microsoft-com:vml',
    'pr':  'http://schemas.openxmlformats.org/package/2006/relationships',
    'dc':  'http://purl.org/dc/elements/1.1/',
}

def _dx(tag):
    p, n = tag.split(':')
    return '{%s}%s' % (_DX_NS[p], n)

def _dx_local(el):
    t = el.tag
    return t.split('}', 1)[1] if isinstance(t, str) and '}' in t else t

def _dx_ns(el):
    t = el.tag
    return t[1:].split('}', 1)[0] if isinstance(t, str) and t.startswith('{') else ''

def _dx_val(el, attr='w:val'):
    return None if el is None else el.get(_dx(attr))

def _dx_on(el):
    """Toggle property (w:b, w:i, …): present and not explicitly false."""
    if el is None:
        return None
    v = el.get(_dx('w:val'))
    return v is None or v.lower() not in ('0', 'false', 'off', 'none')

_DX_MONO = ('courier', 'consol', 'mono', 'menlo', 'monaco', 'lucida console',
            'source code', 'fira code', 'jetbrains', 'inconsolata', 'cascadia')
_DX_SYM = {'F0B7': '•', 'F0A7': '▪', 'F0FC': '✓', 'F0E0': '→', 'F0DF': '←',
           'F0DE': '⇒', 'F0AE': '→', 'F0D8': '⇒', 'F0A8': '•', 'F06C': '●',
           'F06E': '■', 'F0B0': '°', 'F0B1': '±', 'F0A3': '≤', 'F0B3': '≥'}

_DX_TEX = {'Δ': '\\\\Delta ', 'δ': '\\\\delta ', 'α': '\\\\alpha ', 'β': '\\\\beta ', 'γ': '\\\\gamma ',
           'Γ': '\\\\Gamma ', 'ε': '\\\\varepsilon ', 'θ': '\\\\theta ', 'λ': '\\\\lambda ', 'μ': '\\\\mu ',
           'π': '\\\\pi ', 'ρ': '\\\\rho ', 'σ': '\\\\sigma ', 'Σ': '\\\\Sigma ', 'τ': '\\\\tau ', 'φ': '\\\\varphi ',
           'ω': '\\\\omega ', 'Ω': '\\\\Omega ', '×': '\\\\times ', '·': '\\\\cdot ', '⋅': '\\\\cdot ', '≤': '\\\\le ',
           '≥': '\\\\ge ', '≠': '\\\\ne ', '±': '\\\\pm ', '→': '\\\\to ', '∞': '\\\\infty ', '≈': '\\\\approx ',
           '−': '-', '∑': '\\\\sum ', '√': '\\\\sqrt '}

def _dx_slug(text):
    s = re.sub(r'[^\\w\\- ]', '', text.strip().lower())
    return re.sub(r' ', '-', s)

def _dx_esc(text, table=False):
    """Escape Markdown-significant characters in plain text."""
    if not text:
        return text
    text = text.replace('\\\\', '\\\\\\\\')
    text = re.sub('([*' + _BT + r'\\[\\]])', r'\\\\\\1', text)
    # underscores only where they could open/close emphasis (not snake_case)
    text = re.sub(r'(?<!\\w)_|_(?!\\w)', r'\\\\_', text)
    text = re.sub(r'<(?=[A-Za-z/!?])', '&lt;', text)
    if table:
        text = text.replace('|', '\\\\|')
    return text

def _dx_esc_line_start(line):
    """Escape a leading token that would turn a text line into a block element."""
    if re.match(r'(#{1,6}\\s|>|[-+*]\\s|\\d{1,9}[.)]\\s|={3,}\\s*$|-{3,}\\s*$|\\s{4})', line):
        if line.startswith('    '):
            return line.lstrip()
        m = re.match(r'(\\d{1,9})([.)])(\\s.*)', line, re.S)
        if m:
            return m.group(1) + '\\\\' + m.group(2) + m.group(3)
        return '\\\\' + line
    return line

def _dx_roman(n):
    vals = ((1000, 'm'), (900, 'cm'), (500, 'd'), (400, 'cd'), (100, 'c'), (90, 'xc'),
            (50, 'l'), (40, 'xl'), (10, 'x'), (9, 'ix'), (5, 'v'), (4, 'iv'), (1, 'i'))
    out = ''
    for v, r in vals:
        while n >= v:
            out += r
            n -= v
    return out

def _dx_num(n, fmt):
    if fmt == 'lowerLetter':
        return chr(ord('a') + (n - 1) % 26) * ((n - 1) // 26 + 1)
    if fmt == 'upperLetter':
        return chr(ord('A') + (n - 1) % 26) * ((n - 1) // 26 + 1)
    if fmt == 'lowerRoman':
        return _dx_roman(n)
    if fmt == 'upperRoman':
        return _dx_roman(n).upper()
    if fmt == 'decimalZero':
        return '%02d' % n
    return str(n)

_DX_SUP = dict(zip('0123456789+-=()ni', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ'))
_DX_SUB = dict(zip('0123456789+-=()aeoxhklmnpst', '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ'))

def _dx_script(text, sup):
    """Superscript/subscript as Unicode (x², H₂O, ref¹,²) when every character has a
    Unicode form; otherwise fall back to <sup>/<sub> HTML."""
    table = _DX_SUP if sup else _DX_SUB
    core = text.strip()
    if core and all(c in table or c in ', ' for c in core) and any(c in table for c in core):
        return ''.join(table.get(c, c) for c in text)
    tag = 'sup' if sup else 'sub'
    return '<%s>%s</%s>' % (tag, text, tag)

_DX_MD = {'s': ('~~', '<del>', '</del>'), 'b': ('**', '<strong>', '</strong>'), 'i': ('*', '<em>', '</em>')}

def _dx_punct(c):
    import unicodedata
    return unicodedata.category(c)[0] in 'PS'

def _dx_resolve_marks(text):
    """Turn \\\\x00O<k>\\\\x00 / \\\\x00C<k>\\\\x00 tokens into Markdown delimiters, or into HTML tags
    where CommonMark flanking rules would make the delimiter inert (e.g. **a -**b)."""
    parts = re.split('(\\x00[OC][sbi]\\x00)', text)
    real = lambda i, step: next((p[0] if step > 0 else p[-1] for p in
                                 (parts[j] for j in range(i + step, len(parts) if step > 0 else -1, step))
                                 if p and not p.startswith('\\x00')), ' ')
    ok = {}
    stack = []
    for i, p in enumerate(parts):
        if not p.startswith('\\x00'):
            continue
        prev, nxt = real(i, -1), real(i, 1)
        if p[1] == 'O':
            # left-flanking: next not space, and (next not punct or prev is space/punct)
            good = not nxt.isspace() and (not _dx_punct(nxt) or prev.isspace() or _dx_punct(prev))
            stack.append((i, good))
        elif stack:
            j, good_open = stack.pop()
            good = not prev.isspace() and (not _dx_punct(prev) or nxt.isspace() or _dx_punct(nxt))
            ok[i] = ok[j] = good_open and good
    out = []
    for i, p in enumerate(parts):
        if p.startswith('\\x00'):
            md, o, c = _DX_MD[p[2]]
            out.append(md if ok.get(i, True) else (o if p[1] == 'O' else c))
        else:
            out.append(p)
    return ''.join(out)

def _dx_code_span(text):
    ticks = max((len(m) for m in re.findall(_BT + '+', text)), default=0)
    fence = _BT * (ticks + 1)
    pad = ' ' if text.startswith(_BT) or text.endswith(_BT) else ''
    return fence + pad + text + pad + fence


class _DocxToMarkdown:
    def __init__(self, data, filename='document.docx', images='placeholder'):
        self.zip = _dx_zip.ZipFile(io.BytesIO(data))
        self.names = set(self.zip.namelist())
        self.filename = filename
        self.images = images
        self.doc_path = self._main_part()
        self.rels = self._read_rels(self.doc_path)
        self._read_styles()
        self._read_numbering()
        self.notes = {'footnote': self._read_notes('footnotes'),
                      'endnote':  self._read_notes('endnotes')}
        self.note_order = []          # [(kind, id)] in reference order
        self.note_num = {}
        self.list_counters = {}       # numId → {ilvl: current number}
        self.field_stack = []         # complex fields: {'instr', 'phase', 'link'}
        self.anchors = {}             # bookmark name → heading slug
        self.slug_count = {}
        self.image_count = 0

    # ── package ──────────────────────────────────────────────
    def _xml(self, path):
        if path not in self.names:
            return None
        return _dx_ET.fromstring(self.zip.read(path))

    def _main_part(self):
        root = self._xml('_rels/.rels')
        if root is not None:
            for rel in root:
                if rel.get('Type', '').endswith('/officeDocument'):
                    return rel.get('Target').lstrip('/')
        return 'word/document.xml'

    def _read_rels(self, part):
        d, b = _dx_pp.split(part)
        root = self._xml(_dx_pp.join(d, '_rels', b + '.rels'))
        rels = {}
        if root is None:
            return rels
        for rel in root:
            tgt = rel.get('Target', '')
            ext = rel.get('TargetMode') == 'External'
            if not ext:
                tgt = _dx_pp.normpath(_dx_pp.join(d, tgt)) if not tgt.startswith('/') else tgt.lstrip('/')
            rels[rel.get('Id')] = (rel.get('Type', ''), tgt, ext)
        return rels

    def _rel_part(self, suffix):
        for typ, tgt, ext in self.rels.values():
            if typ.endswith('/' + suffix) and not ext:
                return tgt
        return None

    # ── styles ───────────────────────────────────────────────
    def _read_styles(self):
        self.styles, self.default_pstyle = {}, None
        root = self._xml(self._rel_part('styles') or 'word/styles.xml')
        if root is None:
            return
        for st in root.findall(_dx('w:style')):
            sid = st.get(_dx('w:styleId'))
            name_el = st.find(_dx('w:name'))
            based = st.find(_dx('w:basedOn'))
            self.styles[sid] = {
                'type':  st.get(_dx('w:type')),
                'name':  (_dx_val(name_el) or sid or '').strip().lower(),
                'based': _dx_val(based),
                'pPr':   st.find(_dx('w:pPr')),
                'rPr':   st.find(_dx('w:rPr')),
            }
            if st.get(_dx('w:type')) == 'paragraph' and st.get(_dx('w:default')) in ('1', 'true'):
                self.default_pstyle = sid

    def _chain(self, sid):
        seen = set()
        while sid and sid in self.styles and sid not in seen:
            seen.add(sid)
            yield self.styles[sid]
            sid = self.styles[sid]['based']

    def _pstyle(self, p):
        ppr = p.find(_dx('w:pPr'))
        return _dx_val(ppr.find(_dx('w:pStyle'))) if ppr is not None and ppr.find(_dx('w:pStyle')) is not None \\
            else self.default_pstyle

    def _style_names(self, sid):
        return [s['name'] for s in self._chain(sid)]

    # ── numbering ────────────────────────────────────────────
    def _read_numbering(self):
        self.nums, self.abstract = {}, {}
        root = self._xml(self._rel_part('numbering') or 'word/numbering.xml')
        if root is None:
            return
        for an in root.findall(_dx('w:abstractNum')):
            lv = {}
            for l in an.findall(_dx('w:lvl')):
                lv[int(l.get(_dx('w:ilvl'), 0))] = {
                    'fmt':   _dx_val(l.find(_dx('w:numFmt'))) or 'decimal',
                    'start': int(_dx_val(l.find(_dx('w:start'))) or 1),
                    'text':  _dx_val(l.find(_dx('w:lvlText'))) or '',
                    'ind':   self._ind_of(l.find(_dx('w:pPr'))),
                }
            link = an.find(_dx('w:numStyleLink'))
            self.abstract[an.get(_dx('w:abstractNumId'))] = {'lvls': lv, 'link': _dx_val(link)}
        for n in root.findall(_dx('w:num')):
            over = {}
            for o in n.findall(_dx('w:lvlOverride')):
                so = o.find(_dx('w:startOverride'))
                if so is not None:
                    over[int(o.get(_dx('w:ilvl'), 0))] = int(_dx_val(so) or 1)
            self.nums[n.get(_dx('w:numId'))] = {'abs': _dx_val(n.find(_dx('w:abstractNumId'))), 'over': over}

    @staticmethod
    def _ind_of(ppr):
        ind = ppr.find(_dx('w:ind')) if ppr is not None else None
        if ind is None:
            return None
        v = ind.get(_dx('w:left')) or ind.get(_dx('w:start'))
        try:
            return int(v) if v is not None else None
        except ValueError:
            return None

    def _indent(self, p, sid, lvl):
        """Effective left indent in twips: paragraph > numbering level > style chain."""
        v = self._ind_of(p.find(_dx('w:pPr')))
        if v is None and lvl:
            v = lvl.get('ind')
        if v is None:
            for st in self._chain(sid):
                v = self._ind_of(st['pPr'])
                if v is not None:
                    break
        return v

    def _lvl(self, num_id, ilvl):
        num = self.nums.get(num_id)
        if not num:
            return None
        ab = self.abstract.get(num['abs'])
        if ab and not ab['lvls'] and ab['link']:
            # numStyleLink → the numbering style's own numId
            for s in self._chain(ab['link']):
                np_ = s['pPr'].find(_dx('w:numPr')) if s['pPr'] is not None else None
                if np_ is not None:
                    return self._lvl(_dx_val(np_.find(_dx('w:numId'))), ilvl)
        if not ab:
            return None
        lvl = dict(ab['lvls'].get(ilvl) or {'fmt': 'bullet', 'start': 1, 'text': ''})
        if ilvl in num['over']:
            lvl['start'] = num['over'][ilvl]
        return lvl

    def _count(self, num_id, ilvl, lvl):
        c = self.list_counters.setdefault(num_id, {})
        for deeper in [k for k in c if k > ilvl]:
            del c[deeper]
        c[ilvl] = c.get(ilvl, lvl['start'] - 1) + 1
        return c

    def _label(self, num_id, ilvl, counters):
        """Expand lvlText like '%1.%2.' using the current counters."""
        lvl = self._lvl(num_id, ilvl) or {}
        def rep(m):
            k = int(m.group(1)) - 1
            lk = self._lvl(num_id, k) or {'fmt': 'decimal', 'start': 1}
            return _dx_num(counters.get(k, lk['start']), lk['fmt'])
        return re.sub(r'%(\\d)', rep, lvl.get('text', '')).strip()

    def _numpr(self, p, sid):
        ppr = p.find(_dx('w:pPr'))
        src = ppr.find(_dx('w:numPr')) if ppr is not None else None
        if src is None:
            for s in self._chain(sid):
                if s['pPr'] is not None and s['pPr'].find(_dx('w:numPr')) is not None:
                    src = s['pPr'].find(_dx('w:numPr'))
                    break
        if src is None:
            return None
        num_id = _dx_val(src.find(_dx('w:numId')))
        if not num_id or num_id == '0':
            return None
        ilvl = int(_dx_val(src.find(_dx('w:ilvl'))) or 0)
        return num_id, ilvl

    # ── notes ────────────────────────────────────────────────
    def _read_notes(self, kind):
        root = self._xml(self._rel_part(kind) or 'word/%s.xml' % kind)
        notes = {}
        if root is None:
            return notes
        for n in root:
            if n.get(_dx('w:type')) in ('separator', 'continuationSeparator', 'continuationNotice'):
                continue
            notes[n.get(_dx('w:id'))] = n
        return notes

    # ── paragraph classification ─────────────────────────────
    def _heading_level(self, p, sid):
        names = self._style_names(sid)
        for n in names:
            m = re.match(r'(heading|заголовок|überschrift|titre|título|nagłówek)\\s*(\\d)$', n)
            if m:
                return min(int(m.group(2)), 6)
            if n in ('title', 'назва'):
                return 1
        ppr = p.find(_dx('w:pPr'))
        cands = [ppr] + [s['pPr'] for s in self._chain(sid)]
        for c in cands:
            if c is not None and c.find(_dx('w:outlineLvl')) is not None:
                lv = int(_dx_val(c.find(_dx('w:outlineLvl'))) or 9)
                return lv + 1 if lv < 6 else None
        return None

    def _style_has(self, sid, *keys):
        return any(k in n for n in self._style_names(sid) for k in keys)

    # ── run properties ───────────────────────────────────────
    def _rprop(self, r, sid, tag):
        rpr = r.find(_dx('w:rPr'))
        if rpr is not None:
            el = rpr.find(_dx(tag))
            if el is not None:
                return el
            rs = rpr.find(_dx('w:rStyle'))
            for s in self._chain(_dx_val(rs)) if rs is not None else ():
                if s['rPr'] is not None and s['rPr'].find(_dx(tag)) is not None:
                    return s['rPr'].find(_dx(tag))
        for s in self._chain(sid):
            if s['rPr'] is not None and s['rPr'].find(_dx(tag)) is not None:
                return s['rPr'].find(_dx(tag))
        return None

    def _run_fmt(self, r, sid):
        g = lambda t: _dx_on(self._rprop(r, sid, t))
        fonts = self._rprop(r, sid, 'w:rFonts')
        fname = ' '.join(filter(None, [fonts.get(_dx('w:ascii')), fonts.get(_dx('w:hAnsi'))])).lower() \\
            if fonts is not None else ''
        rs = r.find(_dx('w:rPr'))
        rstyle = _dx_val(rs.find(_dx('w:rStyle'))) if rs is not None and rs.find(_dx('w:rStyle')) is not None else None
        va = _dx_val(self._rprop(r, sid, 'w:vertAlign'))
        code = any(m in fname for m in _DX_MONO) or \\
            any(k in n for n in self._style_names(rstyle) for k in ('code', 'html', 'verbatim'))
        return {
            'b': bool(g('w:b')), 'i': bool(g('w:i')),
            's': bool(g('w:strike') or g('w:dstrike')),
            'code': code, 'sup': va == 'superscript', 'sub': va == 'subscript',
            'caps': bool(g('w:caps')), 'hidden': bool(g('w:vanish') or g('w:webHidden')),
        }

    # ── inline content → segments ────────────────────────────
    def _collect(self, el, sid, ctx, link=None):
        """Walk inline markup; append segments {t, fmt, link} / {img} / {raw} to ctx['segs']."""
        for ch in el:
            ln, ns = _dx_local(ch), _dx_ns(ch)
            if ns == _DX_NS['m'] and ln in ('oMath', 'oMathPara'):
                tex = self._omml(ch).strip()
                if tex:
                    ctx['segs'].append({'raw': '$' + tex + '$', 'math': True})
                continue
            if ns == _DX_NS['mc'] and ln == 'AlternateContent':
                choice = ch.find(_dx('mc:Choice'))
                self._collect(choice if choice is not None else ch, sid, ctx, link)
                continue
            if ns != _DX_NS['w']:
                continue
            if ln == 'r':
                self._run(ch, sid, ctx, link)
            elif ln == 'hyperlink':
                href = None
                rid = ch.get(_dx('r:id'))
                if rid and rid in self.rels:
                    href = self.rels[rid][1]
                    if ch.get(_dx('w:anchor')):
                        href += '#' + ch.get(_dx('w:anchor'))
                elif ch.get(_dx('w:anchor')):
                    href = ('anchor', ch.get(_dx('w:anchor')))
                self._collect(ch, sid, ctx, href or link)
            elif ln == 'fldSimple':
                instr = (ch.get(_dx('w:instr')) or '').strip()
                kind = instr.split(' ', 1)[0].upper() if instr else ''
                if kind in ('PAGEREF', 'PAGE', 'NUMPAGES', 'SECTIONPAGES'):
                    continue
                self._collect(ch, sid, ctx, self._field_link(instr) or link)
            elif ln in ('ins', 'moveTo', 'smartTag', 'customXml', 'dir', 'bdo'):
                self._collect(ch, sid, ctx, link)
            elif ln == 'sdt':
                c = ch.find(_dx('w:sdtContent'))
                if c is not None:
                    self._collect(c, sid, ctx, link)
            # w:del, w:moveFrom, bookmarks, proofErr, comments → skipped

    def _field_link(self, instr):
        m = re.match(r'\\s*HYPERLINK\\s+(?:\\\\l\\s+)?"([^"]+)"', instr or '')
        if not m:
            return None
        if re.search(r'\\\\l\\s', instr) and not re.search(r'HYPERLINK\\s+"', instr.split('\\\\l')[0] + ' '):
            return ('anchor', m.group(1))
        return m.group(1)

    def _in_hidden_field(self):
        return any(f['phase'] == 'instr' or f['skip'] for f in self.field_stack)

    def _run(self, r, sid, ctx, link):
        fmt = self._run_fmt(r, sid)
        for ch in r:
            ln = _dx_local(ch)
            if _dx_ns(ch) == _DX_NS['mc'] and ln == 'AlternateContent':
                choice = ch.find(_dx('mc:Choice'))
                self._run_children(choice if choice is not None else ch, sid, ctx, link, fmt)
                continue
            self._run_child(ch, ln, sid, ctx, link, fmt)

    def _run_children(self, el, sid, ctx, link, fmt):
        for ch in el:
            self._run_child(ch, _dx_local(ch), sid, ctx, link, fmt)

    def _run_child(self, ch, ln, sid, ctx, link, fmt):
        if ln == 'fldChar':
            t = ch.get(_dx('w:fldCharType'))
            if t == 'begin':
                self.field_stack.append({'instr': '', 'phase': 'instr', 'skip': False, 'link': None})
            elif t == 'separate' and self.field_stack:
                f = self.field_stack[-1]
                f['phase'] = 'result'
                kind = f['instr'].strip().split(' ', 1)[0].upper() if f['instr'].strip() else ''
                f['skip'] = kind in ('PAGEREF', 'PAGE', 'NUMPAGES', 'SECTIONPAGES')
                f['link'] = self._field_link(f['instr'])
            elif t == 'end' and self.field_stack:
                self.field_stack.pop()
            return
        if ln == 'instrText':
            if self.field_stack and self.field_stack[-1]['phase'] == 'instr':
                self.field_stack[-1]['instr'] += ch.text or ''
            return
        if self._in_hidden_field() or fmt['hidden']:
            return
        flink = next((f['link'] for f in reversed(self.field_stack) if f['link']), None)
        lk = link or flink
        if ln == 't':
            txt = ch.text or ''
            if fmt['caps']:
                txt = txt.upper()
            self._push(ctx, txt, fmt, lk)
        elif ln == 'tab' or ln == 'ptab':
            self._push(ctx, '\\t', fmt, lk)
        elif ln in ('br', 'cr'):
            if ch.get(_dx('w:type')) in ('page', 'column'):
                return
            self._push(ctx, '\\n', fmt, lk)
        elif ln == 'noBreakHyphen':
            self._push(ctx, '-', fmt, lk)
        elif ln == 'sym':
            c = (ch.get(_dx('w:char')) or '').upper()
            self._push(ctx, _DX_SYM.get(c, chr(int(c, 16)) if c and not c.startswith('F0') else ''), fmt, lk)
        elif ln in ('drawing', 'pict', 'object'):
            self._image(ch, ctx, lk)
        elif ln in ('footnoteReference', 'endnoteReference'):
            kind = 'footnote' if ln.startswith('foot') else 'endnote'
            nid = ch.get(_dx('w:id'))
            key = (kind, nid)
            if nid in self.notes[kind]:
                if key not in self.note_num:
                    self.note_order.append(key)
                    self.note_num[key] = len(self.note_order)
                ctx['segs'].append({'raw': '[^%d]' % self.note_num[key]})

    def _push(self, ctx, text, fmt, link):
        if text:
            ctx['segs'].append({'t': text, 'fmt': fmt, 'link': link})

    def _image(self, el, ctx, link):
        # text boxes inside shapes → separate blocks after this paragraph
        for tb in el.iter(_dx('w:txbxContent')):
            ctx['textboxes'].append(tb)
        alt, target = '', None
        for dp in el.iter(_dx('wp:docPr')):
            alt = (dp.get('descr') or dp.get('title') or '').strip()
            break
        for blip in el.iter(_dx('a:blip')):
            rid = blip.get(_dx('r:embed')) or blip.get(_dx('r:link'))
            if rid in self.rels:
                target = self.rels[rid][1]
            break
        if target is None:
            for im in el.iter(_dx('v:imagedata')):
                rid = im.get(_dx('r:id'))
                if rid in self.rels:
                    target = self.rels[rid][1]
                    alt = alt or im.get('{urn:schemas-microsoft-com:office:office}title') or ''
                break
        if target is None:
            return
        self.image_count += 1
        alt = alt.replace('\\n', ' ').replace('[', '(').replace(']', ')')
        src = target
        if self.images == 'embed':
            src = self._data_uri(target) or target
        elif not str(target).startswith(('http://', 'https://')):
            src = 'media/' + _dx_pp.basename(target)
        ctx['segs'].append({'raw': '![%s](%s)' % (alt, src.replace(' ', '%20'))})

    def _data_uri(self, path):
        if path not in self.names:
            return None
        import base64
        ext = path.rsplit('.', 1)[-1].lower()
        mime = {'jpg': 'jpeg', 'jpeg': 'jpeg', 'png': 'png', 'gif': 'gif', 'svg': 'svg+xml',
                'webp': 'webp', 'bmp': 'bmp'}.get(ext)
        if not mime:
            return None
        return 'data:image/%s;base64,%s' % (mime, base64.b64encode(self.zip.read(path)).decode())

    # ── segments → Markdown ──────────────────────────────────
    def _render(self, segs, table=False, no_bold=False, code=False):
        if code:
            return ''.join(s.get('t', '') for s in segs if 't' in s)
        nl = '<br>' if table else '  \\n'
        # 1) merge adjacent text segments with identical formatting + link;
        #    whitespace-only text joins the previous segment (avoids marker churn)
        items = []
        for s in segs:
            if 'raw' in s:
                items.append(dict(s))
                continue
            f = dict(s['fmt'])
            if no_bold:
                f['b'] = False
            key = (f['b'], f['i'], f['s'], f['code'], f['sup'], f['sub'])
            prev = items[-1] if items and 't' in items[-1] else None
            if prev and (prev['key'] == key or not s['t'].strip()) and prev['link'] == s['link']:
                prev['t'] += s['t']
            elif prev and not prev['t'].strip() and prev['link'] == s['link']:
                prev.update({'t': prev['t'] + s['t'], 'key': key, 'f': f})
            else:
                items.append({'t': s['t'], 'key': key, 'f': f, 'link': s['link']})
        # 2) group by link, render emphasis with a marker stack inside each group
        out, i = [], 0
        while i < len(items):
            it = items[i]
            if 'raw' in it:
                raw = it['raw']
                if it.get('math'):
                    # Word spaces equations visually; the text around them often has no spaces
                    if out and out[-1] and not out[-1][-1].isspace() and out[-1][-1] not in '([{"\\'«':
                        raw = ' ' + raw
                    nxt = items[i + 1] if i + 1 < len(items) else None
                    if nxt and 't' in nxt and nxt['t'][:1].isalnum():
                        raw += ' '
                out.append(raw)
                i += 1
                continue
            j = i
            while j < len(items) and 't' in items[j] and items[j]['link'] == it['link']:
                j += 1
            body = self._emph(items[i:j], table, nl)
            href = self._href(it['link']) if it['link'] else None
            if href and body.strip():
                lead = body[:len(body) - len(body.lstrip())]
                trail = body[len(body.rstrip()):]
                label = body.strip()
                if label in (href, _dx_esc(href, table)) and re.match(r'(https?://|mailto:)', href):
                    out.append(lead + '<' + href + '>' + trail)
                else:
                    out.append(lead + '[' + label + '](' + href.replace(' ', '%20').replace(')', '%29') + ')' + trail)
            else:
                out.append(body)
            i = j
        return ''.join(out).replace('\\t', ' ')

    def _emph(self, items, table, nl):
        out, stack = [], []
        order = (('s', '~~'), ('b', '**'), ('i', '*'))

        def close_to(keep):
            # pop markers until every remaining one is wanted; move trailing spaces outside
            while stack and (stack[-1] not in keep or any(m not in keep for m in stack)):
                txt = ''.join(out)
                stripped = txt.rstrip()          # incl. NBSP and other Unicode spaces
                ws = txt[len(stripped):]
                out[:] = [stripped, '\\x00C' + stack.pop() + '\\x00', ws]

        # split at hard line breaks: emphasis is closed and reopened around each break
        pieces = []
        for it in items:
            for n, part in enumerate(it['t'].split('\\n')):
                if n:
                    pieces.append(None)
                if part:
                    pieces.append({'f': it['f'], 't': part})
        for it in pieces:
            if it is None:
                close_to([])
                out.append(nl)
                continue
            f, t = it['f'], it['t']
            want = [k for k, _ in order if f[k]]
            if not t.strip():
                out.append(t)
                continue
            close_to(want)
            lead = t[:len(t) - len(t.lstrip())]
            core = t[len(lead):]
            trail = core[len(core.rstrip()):]
            core = core[:len(core) - len(trail)] if trail else core
            out.append(lead)
            for k, m in order:
                if f[k] and k not in stack:
                    stack.append(k)
                    out.append('\\x00O' + k + '\\x00')
            piece = _dx_code_span(core) if f['code'] else _dx_esc(core, table)
            if (f['sup'] or f['sub']) and not f['code']:
                piece = _dx_script(piece, f['sup'])
            out.append(piece)
            out.append(trail)
        close_to([])
        return _dx_resolve_marks(''.join(out))

    def _href(self, link):
        if isinstance(link, tuple):
            target = self.anchors.get(link[1])
            return '#' + target if target else None
        return link

    # ── blocks ───────────────────────────────────────────────
    def _blocks(self, parent, out, in_table=False):
        for ch in parent:
            if _dx_ns(ch) != _DX_NS['w']:
                if _dx_ns(ch) == _DX_NS['mc'] and _dx_local(ch) == 'AlternateContent':
                    c = ch.find(_dx('mc:Choice'))
                    if c is not None:
                        self._blocks(c, out, in_table)
                continue
            ln = _dx_local(ch)
            if ln == 'p':
                self._paragraph(ch, out, in_table)
            elif ln == 'tbl':
                self._table(ch, out)
            elif ln == 'sdt':
                pr = ch.find(_dx('w:sdtPr'))
                c = ch.find(_dx('w:sdtContent'))
                if c is not None:
                    self._blocks(c, out, in_table)
            elif ln in ('ins', 'moveTo', 'customXml'):
                self._blocks(ch, out, in_table)

    def _paragraph(self, p, out, in_table):
        sid = self._pstyle(p)
        names = self._style_names(sid)
        ctx = {'segs': [], 'textboxes': []}
        self._collect(p, sid, ctx)
        toc = next((re.match(r'(?:toc|зміст)\\s*(\\d)', n) for n in names
                    if re.match(r'(?:toc|зміст)\\s*\\d', n)), None)
        if toc:
            # TOC entry → bullet link to the heading (page numbers are dropped)
            text = re.sub(r'[\\s.…]*\\d*\\s*$', '', self._render(ctx['segs']).replace('\\t', ' ')).strip()
            text = re.sub(r'\\s*\\.{3,}\\s*(?=\\]|$)', '', text)
            if text:
                out.append({'type': 'li', 'level': int(toc.group(1)) - 1, 'ordered': False, 'n': None,
                            'text': re.sub(r' {2,}', ' ', text), 'ind': 720 * int(toc.group(1))})
            return
        segs = ctx['segs']
        plain = ''.join(s.get('t', '') for s in segs)
        has_raw = any('raw' in s for s in segs)

        level = self._heading_level(p, sid)
        numpr = self._numpr(p, sid)
        is_code = self._style_has(sid, 'code', 'html preformatted', 'preformatted', 'source', 'listing', 'verbatim')
        text_segs = [s for s in segs if 't' in s and s['t'].strip()]
        if not is_code and text_segs and all(s['fmt']['code'] for s in text_segs) and not has_raw \\
                and level is None and numpr is None:
            is_code = True

        if not plain.strip() and not has_raw:
            ppr = p.find(_dx('w:pPr'))
            bdr = ppr.find(_dx('w:pBdr')) if ppr is not None else None
            if bdr is not None and bdr.find(_dx('w:bottom')) is not None and not in_table:
                out.append({'type': 'hr'})
            self._textboxes(ctx, out, in_table)
            return

        if level is not None:
            text = self._render(segs, no_bold=True).replace('  \\n', ' ').strip()
            if text and numpr is not None:
                lvl = self._lvl(numpr[0], numpr[1])
                if lvl and lvl['fmt'] not in ('bullet', 'none'):
                    label = self._label(numpr[0], numpr[1], self._count(numpr[0], numpr[1], lvl))
                    if label and not text.startswith(label):
                        text = _dx_esc(label) + ' ' + text
            if text:
                slug = self._register_heading(p, plain)
                out.append({'type': 'h', 'level': level, 'text': text, 'slug': slug})
        elif is_code:
            out.append({'type': 'code', 'text': self._render(segs, code=True).rstrip()})
        elif numpr is not None:
            num_id, ilvl = numpr
            lvl = self._lvl(num_id, ilvl) or {'fmt': 'bullet', 'start': 1}
            ordered = lvl['fmt'] not in ('bullet', 'none')
            n = None
            if ordered:
                n = self._count(num_id, ilvl, lvl)[ilvl]
            text = self._render(segs).strip()
            if lvl['fmt'] == 'none':
                out.append({'type': 'p', 'text': text})
            else:
                ind = self._indent(p, sid, self._lvl(num_id, ilvl))
                out.append({'type': 'li', 'level': ilvl, 'ordered': ordered, 'n': n, 'text': text,
                            'num': num_id, 'ind': ind if ind is not None else 720 * (ilvl + 1)})
        elif self._style_has(sid, 'quote', 'цитата'):
            out.append({'type': 'quote', 'text': self._render(segs).strip()})
        elif self._style_has(sid, 'caption', 'назва об'):
            t = self._render(segs).strip()
            out.append({'type': 'p', 'text': '*' + t + '*' if not t.startswith('*') else t})
        else:
            out.append({'type': 'p', 'text': self._render(segs).strip()})
        self._textboxes(ctx, out, in_table)

    def _textboxes(self, ctx, out, in_table):
        for tb in ctx['textboxes']:
            self._blocks(tb, out, in_table)

    def _register_heading(self, p, plain):
        base = _dx_slug(plain) or 'section'
        n = self.slug_count.get(base, 0)
        self.slug_count[base] = n + 1
        slug = base if n == 0 else '%s-%d' % (base, n)
        for bm in p.iter(_dx('w:bookmarkStart')):
            name = bm.get(_dx('w:name'))
            if name:
                self.anchors[name] = slug
        return slug

    def _prescan_anchors(self, body):
        """Map heading bookmarks to slugs before rendering, so links resolve forward."""
        saved = dict(self.slug_count)
        for p in body.iter(_dx('w:p')):
            sid = self._pstyle(p)
            if self._heading_level(p, sid) is None:
                continue
            plain = ''.join(t.text or '' for t in p.iter(_dx('w:t')))
            if plain.strip():
                self._register_heading(p, plain)
        self.slug_count = saved

    # ── tables ───────────────────────────────────────────────
    def _table(self, tbl, out):
        rows = []
        for tr in self._direct(tbl, 'tr'):
            cells = []
            for cell in self._direct(tr, 'tc'):
                pr = cell.find(_dx('w:tcPr'))
                span = int(_dx_val(pr.find(_dx('w:gridSpan'))) or 1) if pr is not None and pr.find(_dx('w:gridSpan')) is not None else 1
                vm = pr.find(_dx('w:vMerge')) if pr is not None else None
                cont = vm is not None and (_dx_val(vm) or 'continue') == 'continue'
                blocks = []
                if not cont:
                    self._blocks(cell, blocks, in_table=True)
                cells.append({'blocks': blocks, 'span': span, 'cont': cont})
            rows.append(cells)
        rows = [r for r in rows if r]
        if not rows:
            return
        ncols = max(sum(c['span'] for c in r) for r in rows)
        complex_ = ncols == 1 or any(
            b['type'] in ('h', 'li', 'code', 'table', 'quote', 'hr') or
            (b['type'] == 'p' and b['text'].count('\\n') > 6)
            for r in rows for c in r for b in c['blocks']) or \\
            any(sum(1 for b in c['blocks']) > 6 for r in rows for c in r)
        if complex_:
            # Layout table / callout box → linearize cell content as normal blocks
            inner = []
            for r in rows:
                for c in r:
                    inner.extend(c['blocks'])
            if ncols == 1 and len(rows) == 1 and all(b['type'] in ('p', 'li', 'quote', 'code') for b in inner):
                out.append({'type': 'callout', 'blocks': inner})
            else:
                out.extend(inner)
            return
        grid = []
        for r in rows:
            line = []
            for c in r:
                txt = '' if c['cont'] else self._cell_text(c['blocks'])
                line.append(txt)
                line.extend([''] * (c['span'] - 1))
            line += [''] * (ncols - len(line))
            grid.append(line)
        if all(not x.strip() for row in grid for x in row):
            return
        out.append({'type': 'table', 'rows': grid})

    def _direct(self, el, name):
        # children named w:<name>, looking through sdt / customXml wrappers
        for ch in el:
            ln = _dx_local(ch)
            if ln == name:
                yield ch
            elif ln in ('sdt', 'sdtContent', 'customXml'):
                yield from self._direct(ch, name)

    def _cell_text(self, blocks):
        parts = []
        for b in blocks:
            if b['type'] == 'li':
                parts.append(('%d. ' % b['n'] if b['ordered'] else '• ') + b['text'])
            elif b['type'] in ('p', 'quote', 'h'):
                parts.append(b['text'])
            elif b['type'] == 'code':
                parts.append(_dx_code_span(b['text'].replace('\\n', ' ')))
        parts = ['\\\\' + x if re.match(r'^:?-{3,}:?$', x.strip()) else x for x in parts]
        txt = '<br>'.join(x for x in parts if x)
        txt = txt.replace('  \\n', '<br>').replace('\\n', ' ')
        return re.sub(r'(?<!\\\\)\\|', r'\\\\|', txt)

    # ── equations (OMML → LaTeX) ─────────────────────────────
    def _omml(self, el):
        ln = _dx_local(el)
        k = lambda name: el.find(_dx('m:' + name))
        sub = lambda name: self._omml(k(name)) if k(name) is not None else ''
        if ln == 't':
            return ''.join(_DX_TEX.get(c, c) for c in (el.text or '').replace('\\\\', '\\\\backslash '))
        if ln == 'f':
            return '\\\\frac{%s}{%s}' % (sub('num'), sub('den'))
        if ln == 'sSup':
            return '{%s}^{%s}' % (sub('e'), sub('sup'))
        if ln == 'sSub':
            return '{%s}_{%s}' % (sub('e'), sub('sub'))
        if ln == 'sSubSup':
            return '{%s}_{%s}^{%s}' % (sub('e'), sub('sub'), sub('sup'))
        if ln == 'rad':
            deg = sub('deg')
            return ('\\\\sqrt[%s]{%s}' % (deg, sub('e'))) if deg.strip() else '\\\\sqrt{%s}' % sub('e')
        if ln == 'd':
            pr = k('dPr')
            beg = _dx_val(pr.find(_dx('m:begChr')), 'm:val') if pr is not None and pr.find(_dx('m:begChr')) is not None else '('
            end = _dx_val(pr.find(_dx('m:endChr')), 'm:val') if pr is not None and pr.find(_dx('m:endChr')) is not None else ')'
            inner = ', '.join(self._omml(e) for e in el.findall(_dx('m:e')))
            return '\\\\left%s %s \\\\right%s' % (beg or '.', inner, end or '.')
        if ln == 'nary':
            pr = k('naryPr')
            chr_ = _dx_val(pr.find(_dx('m:chr')), 'm:val') if pr is not None and pr.find(_dx('m:chr')) is not None else '∫'
            op = {'∑': '\\\\sum', '∏': '\\\\prod', '∫': '\\\\int', '∬': '\\\\iint', '∮': '\\\\oint', '⋃': '\\\\bigcup', '⋂': '\\\\bigcap'}.get(chr_, chr_)
            s, p_ = sub('sub'), sub('sup')
            return op + ('_{%s}' % s if s else '') + ('^{%s}' % p_ if p_ else '') + ' ' + sub('e')
        if ln == 'func':
            return '%s %s' % (sub('fName'), sub('e'))
        if ln == 'bar':
            return '\\\\overline{%s}' % sub('e')
        if ln == 'acc':
            return '\\\\hat{%s}' % sub('e')
        if ln in ('rPr', 'ctrlPr', 'fPr', 'sSupPr', 'sSubPr', 'radPr', 'dPr', 'naryPr', 'funcPr',
                  'barPr', 'accPr', 'oMathParaPr', 'degHide') or _dx_ns(el) == _DX_NS['w'] and ln == 'rPr':
            return ''
        return ''.join(self._omml(c) for c in el)

    # ── serialization ────────────────────────────────────────
    def _serialize(self, blocks):
        out = []
        prev = None
        depth_stack = []          # ilvl of each open list level
        i = 0
        while i < len(blocks):
            b = blocks[i]
            t = b['type']
            if t != 'li':
                depth_stack = []
            if t == 'code':
                lines = [b['text']]
                while i + 1 < len(blocks) and blocks[i + 1]['type'] == 'code':
                    i += 1
                    lines.append(blocks[i]['text'])
                body = '\\n'.join(lines)
                fence = _BT * max(3, max((len(m) for m in re.findall(_BT + '+', body)), default=0) + 1)
                out += ['', fence, body, fence]
            elif t == 'h':
                out += ['', '#' * b['level'] + ' ' + b['text']]
            elif t == 'li':
                # nesting follows the visual indentation (ilvl alone misses
                # "List Bullet 2"-style lists that restart at ilvl 0 with a deeper indent)
                ind = b['ind']
                while depth_stack and depth_stack[-1] > ind + 90:
                    depth_stack.pop()
                if not depth_stack or ind > depth_stack[-1] + 90:
                    depth_stack.append(ind)
                depth = len(depth_stack) - 1
                marker = '%d.' % b['n'] if b['ordered'] else '-'
                text = b['text'].replace('  \\n', '  \\n' + '    ' * (depth + 1))
                pb = blocks[i - 1] if i else None
                if prev != 'li' or (depth == 0 and pb.get('ordered') != b['ordered']):
                    out.append('')
                elif depth == 0 and b['ordered'] and pb.get('ordered') and pb.get('num') != b.get('num') \\
                        and b['n'] <= pb['n']:
                    out += ['', '<!-- -->', '']     # a new numbered list starts here
                out.append('    ' * depth + marker + ' ' + text)
            elif t == 'quote':
                out += [''] + ['> ' + l for l in b['text'].split('\\n')]
            elif t == 'callout':
                inner = self._serialize(b['blocks']).split('\\n')
                out += [''] + [('> ' + l).rstrip() if l.strip() else '>' for l in inner]
            elif t == 'hr':
                out += ['', '---']
            elif t == 'table':
                rows = b['rows']
                out += ['', '| ' + ' | '.join(rows[0]) + ' |',
                        '|' + '|'.join(' --- ' for _ in rows[0]) + '|']
                out += ['| ' + ' | '.join(r) + ' |' for r in rows[1:]]
            else:  # paragraph
                if b['text']:
                    lines = b['text'].split('\\n')
                    lines[0] = _dx_esc_line_start(lines[0])
                    lines = [lines[0]] + [_dx_esc_line_start(l) for l in lines[1:]]
                    out += [''] + ['\\n'.join(lines)]
            prev = t
            i += 1
        text = '\\n'.join(out)
        text = re.sub(r'\\n{3,}', '\\n\\n', text)
        return text.strip('\\n')

    def _notes_md(self):
        if not self.note_order:
            return ''
        out = []
        for kind, nid in self.note_order:
            blocks = []
            self._blocks(self.notes[kind][nid], blocks)
            body = ' '.join(b.get('text', '') for b in blocks if b.get('text')).strip()
            out.append('[^%d]: %s' % (self.note_num[(kind, nid)], body))
        return '\\n'.join(out)

    def _core_props(self):
        root = self._xml('docProps/core.xml')
        if root is None:
            return {}
        t = root.find(_dx('dc:title'))
        return {'title': (t.text or '').strip() if t is not None else ''}

    def convert(self):
        root = self._xml(self.doc_path)
        if root is None:
            raise ValueError('word/document.xml not found — not a valid DOCX file')
        body = root.find(_dx('w:body'))
        self._prescan_anchors(body)
        self.list_counters, self.field_stack = {}, []
        blocks = []
        self._blocks(body, blocks)
        md = self._serialize(blocks)
        if not any(b['type'] == 'h' for b in blocks):
            title = self._core_props().get('title') or re.sub(r'\\.docx$', '', self.filename, flags=re.I)
            md = '# ' + _dx_esc(title) + '\\n\\n' + md
        notes = self._notes_md()
        if notes:
            md += '\\n\\n' + notes
        md = '\\n'.join(l.rstrip() if not l.endswith('  ') or not l.strip() else l for l in md.split('\\n'))
        return md.strip() + '\\n'


def docx_to_md(file_bytes, filename, images='placeholder'):
    """Convert DOCX bytes to Markdown. images: 'placeholder' (media/… links) or 'embed' (data URIs)."""
    try:
        return _DocxToMarkdown(bytes(file_bytes), filename, images).convert()
    except _dx_zip.BadZipFile:
        return '# DOCX Conversion Error\\n\\n> The file is not a valid DOCX (ZIP) package. Old .doc files must be re-saved as .docx.'
    except Exception as e:
        return f'# DOCX Conversion Error\\n\\n> Error: {str(e)}\\n\\nPlease try again with a different DOCX file.'

def scribe_text_to_md(pages_json, filename):
    try:
        pages = json.loads(pages_json)
    except Exception:
        return postprocess_text(pages_json)

    try:
        base_name = _safe_re_sub(r'\\.pdf$', '', filename, flags=re.IGNORECASE)
        total = len(pages)
        md_out = [
            f'# {base_name}', '',
            f'> Converted from PDF via Scribe.js OCR  •  {datetime.now().strftime("%Y-%m-%d %H:%M")}',
            f'> Pages: {total}', '',
        ]

        scanned_pages = [p.get('pageNum', 1) for p in pages if p.get('isScanned')]

        for page in pages:
            try:
                page_num = page.get('pageNum', 1)
                text = page.get('text', '').strip()
                words = page.get('words', [])

                if total > 1:
                    md_out += [f'## Page {page_num}', '']

                if not text:
                    md_out.append('> *No text extracted from this page*')
                    md_out.append('')
                    continue

                raw_lines = [l.strip() for l in text.split('\\n') if l.strip()]
                para_lines = []
                i = 0
                while i < len(raw_lines):
                    line = raw_lines[i]

                    if _is_page_number(line):
                        i += 1
                        continue

                    word_data = _get_word_data_for_line(words, line)
                    avg_height = word_data.get('avg_height', 0)
                    is_bold = word_data.get('is_bold', False)

                    level = 0
                    if avg_height > 18: level = 1
                    elif avg_height > 14: level = 2
                    elif avg_height > 11: level = 3
                    elif avg_height > 0 and is_bold and len(line.split()) <= 10: level = 4
                    else:
                        if line.isupper() and 2 <= len(line.split()) <= 8:
                            level = 2
                        elif (line[0].isupper() and line.endswith(':') and len(line.split()) <= 6):
                            level = 3

                    if level:
                        md_out.append('#' * level + ' ' + _clean(line))
                        md_out.append('')
                    elif _safe_list_match(line):
                        cleaned = _safe_list_sub(line)
                        md_out.append('- ' + _clean(cleaned))
                    else:
                        if (para_lines and
                            para_lines[-1] and
                            not para_lines[-1][-1] in '.!?:' and
                            not para_lines[-1].startswith('#') and
                            not para_lines[-1].startswith('-') and
                            not para_lines[-1].startswith('>') and
                            i + 1 < len(raw_lines)):
                            para_lines[-1] = para_lines[-1] + ' ' + _clean(line)
                        else:
                            para_lines.append(_clean(line))
                            md_out.extend(para_lines[-1:])
                            para_lines = []

                    i += 1

                md_out.append('')
            except Exception:
                continue

        tables_md = _scribe_detect_tables(pages)
        if tables_md:
            md_out += ['', '## Extracted Tables', ''] + tables_md

        if scanned_pages:
            md_out += [
                '', '---',
                f'> **Scanned pages:** {scanned_pages} were processed with Tesseract OCR via Scribe.js.',
                '> Accuracy depends on scan quality and image resolution.',
                '',
            ]

        return postprocess_text('\\n'.join(md_out))
    except Exception:
        return pages_json

def _get_word_data_for_line(words, line):
    try:
        if not words:
            return {}
        line_words = line.split()
        matched = []
        for w in words:
            if w.get('text', '') in line_words:
                matched.append(w)
        if not matched:
            return {}
        heights = [w.get('bbox', {}).get('h', 0) for w in matched if w.get('bbox')]
        bolds = [w.get('bold', False) for w in matched]
        return {
            'avg_height': sum(heights)/len(heights) if heights else 0,
            'is_bold': sum(bolds)/max(len(bolds), 1) > 0.5,
        }
    except Exception:
        return {}

def _scribe_detect_tables(pages):
    try:
        md = []
        for page in pages:
            words = page.get('words', [])
            if len(words) < 6:
                continue

            rows = {}
            for w in words:
                bbox = w.get('bbox', {})
                y = round(bbox.get('y', 0) / 5) * 5
                rows.setdefault(y, []).append(w)

            row_list = [v for v in rows.values() if len(v) >= 2]
            if len(row_list) < 2:
                continue

            all_x = sorted(w.get('bbox', {}).get('x', 0) for row in row_list for w in row)
            if not all_x:
                continue
            col_clusters = [[all_x[0]]]
            for x in all_x[1:]:
                if x - col_clusters[-1][-1] < 20:
                    col_clusters[-1].append(x)
                else:
                    col_clusters.append([x])

            col_anchors = [sum(c)/len(c) for c in col_clusters if len(c) >= 2]
            if len(col_anchors) < 2:
                continue

            table_rows = []
            for row_words in sorted(row_list, key=lambda r: r[0].get('bbox', {}).get('y', 0)):
                cells = [''] * len(col_anchors)
                for w in row_words:
                    x = w.get('bbox', {}).get('x', 0)
                    ci = min(range(len(col_anchors)), key=lambda i: abs(col_anchors[i]-x))
                    t = w.get('text', '').replace('|', '/')
                    cells[ci] = (cells[ci] + ' ' + t).strip()
                if any(c for c in cells):
                    table_rows.append(cells)

            if len(table_rows) >= 2:
                w = len(table_rows[0])
                md += ['', '| ' + ' | '.join(table_rows[0]) + ' |',
                           '| ' + ' | '.join('---' for _ in range(w)) + ' |']
                for row in table_rows[1:]:
                    row = (row + [''] * w)[:w]
                    md.append('| ' + ' | '.join(row) + ' |')
                md.append('')

        return md
    except Exception:
        return []

def md_to_html(md):
    try:
        import re as _re
        from html import escape as _esc
        # Escape every source line first so HTML in the input renders as text
        lines = [_esc(l, quote=False) for l in md.split('\\n')]
        html = []
        in_code = False
        in_list = False
        for line in lines:
            if line.strip().startswith(_BT*3):
                if in_code:
                    html.append('</code></pre>')
                    in_code = False
                else:
                    html.append('<pre><code>')
                    in_code = True
                continue
            if in_code:
                html.append(line)          # already HTML-escaped above
                continue
            # re-allow a whitelist of attribute-less inline tags (x<sup>2</sup>, H<sub>2</sub>O, <br>)
            line = _re.sub(r'&lt;(/?)(sup|sub|br|b|i|strong|em|del|s|u|kbd|mark)\\s*/?&gt;', r'<\\1\\2>', line)
            if not line.strip():
                if in_list:
                    html.append('</ul>')
                    in_list = False
                html.append('<br>')
                continue
            if line.startswith('### '): html.append(f'<h3>{line[4:]}</h3>')
            elif line.startswith('## '): html.append(f'<h2>{line[3:]}</h2>')
            elif line.startswith('# '): html.append(f'<h1>{line[2:]}</h1>')
            elif line.startswith('- ') or line.startswith('* '):
                if not in_list:
                    html.append('<ul>')
                    in_list = True
                html.append(f'<li>{line[2:]}</li>')
            elif line.startswith('&gt; '): html.append(f'<blockquote>{line[5:]}</blockquote>')  # '> ' after escaping
            else:
                if in_list:
                    html.append('</ul>')
                    in_list = False
                html.append(f'<p>{line}</p>')
        if in_list: html.append('</ul>')
        result = '\\n'.join(html)
        result = _re.sub(r'\\*\\*\\*(.+?)\\*\\*\\*', r'<b><i>\\1</i></b>', result)
        result = _re.sub(r'\\*\\*(.+?)\\*\\*', r'<b>\\1</b>', result)
        result = _re.sub(r'\\*(.+?)\\*', r'<i>\\1</i>', result)
        result = _re.sub(_BT + r'(.+?)' + _BT, r'<code>\\1</code>', result)
        return result
    except Exception:
        return md


# ═══════════════════════════════════════════════════════════════════════════
# TEXT CHECKER — функції перевірки якості тексту
# ═══════════════════════════════════════════════════════════════════════════

import re as _re_c

def detect_language(text):
    """Визначає мову тексту: 'uk' або 'en'."""
    if not text:
        return 'en'
    cyr = len(_re_c.findall('[а-яіїєґА-ЯІЇЄҐ]', text))
    lat = len(_re_c.findall('[a-zA-Z]', text))
    return 'uk' if cyr >= lat else 'en'

def _make_error(pos, end, word, msg, etype, suggestions=None, msg_key=None, msg_args=None, sugg_key=None, sugg_args=None):
    return {
        'pos': pos, 'end': end, 'word': word,
        'msg': msg, 'type': etype,
        'suggestions': suggestions or [],
        'msg_key': msg_key, 'msg_args': msg_args or {},
        'sugg_key': sugg_key, 'sugg_args': sugg_args or {}
    }

def check_stage_repeats(text):
    """Знаходить повторення слів поруч."""
    errors = []
    words = list(_re_c.finditer(r'\\b(\\w+)\\b', text, _re_c.IGNORECASE))
    for i in range(1, len(words)):
        w1, w2 = words[i-1], words[i]
        if w1.group().lower() == w2.group().lower() and len(w1.group()) > 2:
            errors.append(_make_error(
                w2.start(), w2.end(), w2.group(),
                'Повтор слова \\u00ab' + w2.group() + '\\u00bb', 'repeat',
                ['(видалити)'],
                msg_key='err.msg.repeat', msg_args={'word': w2.group()}
            ))
    return errors

def check_stage_spaces(text):
    """Знаходить зайві пробіли."""
    errors = []
    for m in _re_c.finditer(r'[ \\t]{2,}', text):
        errors.append(_make_error(
            m.start(), m.end(), m.group(),
            'Зайві пробіли', 'space', [' '],
            msg_key='err.msg.extraSpaces'
        ))
    for m in _re_c.finditer(r'[ \\t]+([,\\.!?;:])', text):
        errors.append(_make_error(
            m.start(), m.end(), m.group(),
            'Пробіл перед знаком пунктуації', 'space',
            [m.group(1)],
            msg_key='err.msg.spaceBeforePunct'
        ))
    return errors

def check_stage_punct(text):
    """Знаходить проблеми з пунктуацією."""
    errors = []
    for m in _re_c.finditer(r'[.!?,;]{2,}', text):
        if m.group() not in ('...', '\\u2026', '!!', '??'):
            errors.append(_make_error(
                m.start(), m.end(), m.group(),
                'Подвійна пунктуація', 'punct', [m.group()[0]],
                msg_key='err.msg.doublePunct'
            ))
    return errors

def check_stage_dict(text, lang):
    """Перевірка великої літери на початку речень."""
    errors = []
    for m in _re_c.finditer(r'(?:(?<=[.!?]\\s))([a-z\\u0430-\\u044f\\u0456\\u0457\\u0454\\u0491])', text):
        errors.append(_make_error(
            m.start(1), m.end(1), m.group(1),
            'Речення починається з малої літери', 'capital',
            [m.group(1).upper()],
            msg_key='err.msg.lowercaseStart'
        ))
    return errors

def check_stage_spellcheck(text, lang, prior_errors):
    """Знаходить слова що написані ВЕЛИКИМИ ЛІТЕРАМИ (крім коротких абревіатур)."""
    errors = []
    prior_pos = {e['pos'] for e in prior_errors}
    for m in _re_c.finditer(r'\\b[А-ЯІЇЄҐ]{4,}\\b', text):
        if m.start() not in prior_pos:
            errors.append(_make_error(
                m.start(), m.end(), m.group(),
                'Можливо, CAPS LOCK увімкнений', 'spelling',
                [m.group().capitalize()],
                msg_key='err.msg.capsLock'
            ))
    return errors

_UK_GRAMMAR_PAIRS = [
    (r'взагалі то', 'взагалі-то'),
    (r'як що', 'якщо'),
    (r'по відношенню до', 'щодо'),
    (r'по крайній мірі', 'принаймні'),
    (r'в рамках', 'у межах'),
    (r'на даний час', 'наразі'),
    (r'з метою', 'щоб'),
    (r'у будь якому', 'у будь-якому'),
    (r'як найкраще', 'якнайкраще'),
]

def check_stage_grammar(text, lang):
    """Граматичні помилки та русизми."""
    errors = []
    if lang == 'uk':
        for pattern, suggestion in _UK_GRAMMAR_PAIRS:
            for m in _re_c.finditer(pattern, text, _re_c.IGNORECASE):
                errors.append(_make_error(
                    m.start(), m.end(), m.group(),
                    'Граматична помилка або русизм \\u2192 \\u00ab' + suggestion + '\\u00bb',
                    'grammar', [suggestion],
                    msg_key='err.msg.grammarRu', msg_args={'suggestion': suggestion}
                ))
    return errors

_STYLE_WORDS_UK = [
    'здійснювати', 'проводити заходи', 'забезпечувати', 'реалізовувати',
    'є наявним', 'в цілому', 'таким чином', 'в свою чергу',
]
_STYLE_WORDS_EN = [
    'utilize', 'leverage', 'synergy', 'paradigm',
    'going forward', 'in order to',
]

def check_stage_style(text, lang):
    """Знаходить канцеляризми та кліше."""
    errors = []
    words = _STYLE_WORDS_UK if lang == 'uk' else _STYLE_WORDS_EN
    for w in words:
        for m in _re_c.finditer(_re_c.escape(w), text, _re_c.IGNORECASE):
            errors.append(_make_error(
                m.start(), m.end(), m.group(),
                'Канцеляризм або кліше: \\u00ab' + w + '\\u00bb', 'style', ['(спростити)'],
                msg_key='err.msg.cliche', msg_args={'word': w}
            ))
    return errors

def check_stage_passive(text, lang):
    """Знаходить пасивний стан."""
    errors = []
    if lang == 'uk':
        patterns = [r'\\bбуло\\s+\\w+ено\\b', r'\\bбула\\s+\\w+ена\\b', r'\\bбуло\\s+\\w+ано\\b']
    else:
        patterns = [r'\\bwas\\s+\\w+ed\\b', r'\\bwere\\s+\\w+ed\\b', r'\\bbeing\\s+\\w+ed\\b']
    for pat in patterns:
        for m in _re_c.finditer(pat, text, _re_c.IGNORECASE):
            errors.append(_make_error(
                m.start(), m.end(), m.group(),
                'Пасивний стан — розгляньте активний', 'passive', ['(активний стан)'],
                msg_key='err.msg.passive'
            ))
    return errors

def check_stage_structure(text, lang):
    """Перевіряє структуру промту."""
    errors = []
    if len(text) < 100:
        return errors
    has_role   = bool(_re_c.search(r'role|ти|you are|act as|ролі|роль', text, _re_c.IGNORECASE))
    has_task   = bool(_re_c.search(r'task|завдання|мета|потрібно|необхідно|зроби|create|generate|write|analyze', text, _re_c.IGNORECASE))
    has_output = bool(_re_c.search(r'output|format|результат|формат|відповідь|response', text, _re_c.IGNORECASE))
    if not has_role:
        errors.append(_make_error(0, 0, '', 'Відсутній опис ролі або контексту', 'structure', ['Додайте: "You are a\\u2026" або "Ти \\u2014 ..."'], msg_key='err.msg.noRole', sugg_key='err.sugg.noRole'))
    if not has_task:
        errors.append(_make_error(0, 0, '', 'Відсутнє чітке завдання', 'structure', ['Додайте конкретний опис задачі'], msg_key='err.msg.noTask', sugg_key='err.sugg.noTask'))
    if not has_output and len(text) > 200:
        errors.append(_make_error(0, 0, '', 'Відсутній опис очікуваного результату', 'structure', ['Додайте: "Відповідь у форматі\\u2026"'], msg_key='err.msg.noOutput', sugg_key='err.sugg.noOutput'))
    return errors

def check_merge(errors):
    """Злиття та дедублікація помилок."""
    seen = set()
    merged = []
    for e in errors:
        key = (e['pos'], e['end'], e['type'])
        if key not in seen:
            seen.add(key)
            merged.append(e)
    return sorted(merged, key=lambda x: x['pos'])

def apply_all_fixes(text, errors):
    """Застосовує першу пропозицію для кожної помилки (з кінця до початку)."""
    sorted_errors = sorted(
        [e for e in errors if e.get('suggestions') and e['pos'] != e['end']],
        key=lambda x: x['pos'], reverse=True
    )
    skip = {'(видалити)', '(активний стан)', '(спростити)'}
    for e in sorted_errors:
        sugg = e['suggestions'][0]
        if sugg and sugg not in skip:
            text = text[:e['pos']] + sugg + text[e['end']:]
        elif sugg == '(видалити)':
            start = e['pos']
            end   = e['end']
            if start > 0 and text[start-1] == ' ':
                start -= 1
            text = text[:start] + text[end:]
    return text
`;