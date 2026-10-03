/**
 * deepseek.js — JS PROMPT PWA
 * DeepSeek API integration for professional Claude prompt generation.
 * Parity with python_core.js: full domain classification, expert roles,
 * domain-specific methodologies, Probability Yardstick, Examples Clause,
 * anti-hallucination controls, CoT scratchpad enforcement.
 * Personal API key stored in localStorage (sent only to api.deepseek.com); without one,
 * requests go through the authenticated server proxy, which keeps its key server-side.
 */
'use strict';
/* updated: 2026-06-26 — hard-reload browser (Ctrl+Shift+R) if you see cached 404 errors */

const DeepSeek = (() => {

  const ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
  const MODEL    = 'deepseek-chat';
  const LS_KEY   = 'ds_api_key';
  const ENV_URL  = '/env';                // nginx proxies this → env-server.js:3099

  /* ── Key management ──────────────────────────────────────────── */
  // The server never exposes its own DeepSeek key. /api/env only reports whether
  // one is configured; if so, requests without a personal key go through the
  // authenticated server proxy /api/deepseek/chat.
  // Priority: personal key in localStorage > server proxy.
  let _serverKey = false;
  const PROXY_ENDPOINT = '/api/deepseek/chat';

  /**
   * fetchKeyFromEnv() — ask the server once whether it has a DeepSeek key configured.
   * Falls back silently to the localStorage key if the endpoint is unavailable.
   */
  async function fetchKeyFromEnv() {
    try {
      const token = sessionStorage.getItem('_jsat') || '';
      if (!token) return; // Not logged in — use localStorage key
      const resp = await fetch('/api/env', {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: 'Bearer ' + token }
      });
      if (!resp.ok) return; // Silently fall back to localStorage
      const data = await resp.json();
      _serverKey = !!(data && data.deepseekConfigured);
      if (_serverKey) console.info('[DeepSeek] server-side key available via proxy');
    } catch (err) {
      console.info('[DeepSeek] /api/env not reachable — using localStorage key');
    }
  }

  function getKey()   { return localStorage.getItem(LS_KEY) || ''; }
  function setKey(k)  { localStorage.setItem(LS_KEY, k.trim()); }
  function clearKey() { localStorage.removeItem(LS_KEY); }
  function hasKey()   { return !!getKey() || _serverKey; }

  /**
   * chatRequest(body) — POST a chat completion either directly to DeepSeek with the
   * personal key, or through the server proxy (server key) when no personal key is set.
   */
  async function chatRequest(body) {
    const key = getKey();
    if (key) {
      return fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body:    JSON.stringify(body),
      });
    }
    // Refresh an expired access token first so the proxy call doesn't 401
    try { await window.API?.ensureSession?.(); } catch {}
    const token = sessionStorage.getItem('_jsat') || '';
    return fetch(PROXY_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
  }



  /* ── Domain classification (mirrors DomainClassifier in python_core) ── */
  const DOMAIN_PATTERNS = {
    intelligence_analysis: {
      rx: /osint|розвідк|intelligence|геополітик|geopolit|стратегічн|strategic|threat|загроза|risk assessment|nuclear|ядерн|military|військов|conflict|конфлікт|sanctions|санкції|disinformation|дезінформ|propaganda|пропаганд|terrorism|тероризм|scenario|сценарний|war games|ескалація|escalation|crisis|кризов/i,
      weight: 5, priority: 1
    },
    osint: {
      rx: /osint|open source|відкриті джерела|investigation|розслідув|social media|соціальні медіа|geolocation|геолокація|verification|верифікац|digital footprint/i,
      weight: 4, priority: 2
    },
    strategic_risk: {
      rx: /risk matrix|матриця ризиків|scenario planning|сценарне планування|crisis management|кризовий менеджмент|uncertainty|невизначеність|strategic planning|стратегічне планув|risk assessment|оцінка загроз/i,
      weight: 4, priority: 3
    },
    medical_diagnostics: {
      rx: /медицин|медичн|діагност|diagnosis|симптом|symptom|пацієнт|patient|лікуванн|treatment|терапія|therapy|клінічн|clinical|хвороб|disease|protocol|протокол|дозування|dosage|мкб|icd|evidence-based|рандомізован|randomized|placebo|clinical trial/i,
      weight: 5, priority: 1
    },
    cybersecurity: {
      rx: /cybersecurity|кібербезпека|pentest|vulnerability|вразливість|exploit|firewall|encryption|шифрування|authentication|oauth|jwt|csrf|xss|sql injection|malware|reverse engineering|forensics|soc|siem|zero trust|audit/i,
      weight: 5, priority: 1
    },
    financial_analysis: {
      rx: /фінанс|finance|інвестиц|investment|trading|трейдинг|portfolio|портфель|valuation|оцінк|dcf|p\/e|hedge|derivatives|деривативи|accounting|бухгалтер|financial statements|crypto|blockchain|defi|venture capital|private equity|ipo|m&a/i,
      weight: 5, priority: 1
    },
    legal_analysis: {
      rx: /право|закон|legal|law|договір|contract|суд|court|юридичн|attorney|адвокат|regulation|регулюванн|compliance|gdpr|intellectual property|patent|патент|trademark|copyright|авторськ|litigation|arbitration|арбітраж|constitution|кримінальн/i,
      weight: 5, priority: 1
    },
    programming: {
      rx: /код|code|python|javascript|typescript|react|vue|angular|api|sql|database|алгоритм|algorithm|debug|рефактор|refactor|function|клас|class|library|framework|git|docker|kubernetes|backend|frontend|fullstack|microservice|rest|graphql|websocket|regex|тест|testing/i,
      weight: 4, priority: 2
    },
    scientific_research: {
      rx: /research|дослідженн|science|наук|experiment|експеримент|methodology|методолог|peer review|рецензув|publication|публікац|hypothesis|гіпотеза|theory|теорія|laboratory|лабораторн|scientific method/i,
      weight: 4, priority: 2
    },
    data_science: {
      rx: /data science|machine learning|\bml\b|deep learning|нейронна|neural|tensorflow|pytorch|sklearn|pandas|numpy|dataset|датасет|model training|classification|regression|clustering|nlp|computer vision|feature engineering|hyperparameter|cross-validation|overfitting|embedding|\brag\b/i,
      weight: 4, priority: 2
    },
    business_strategy: {
      rx: /стратегія|strategy|бізнес|business|startup|стартап|go-to-market|product market fit|unit economics|burn rate|swot|porter|mckinsey|bcg matrix|okr|balanced scorecard|competitive|конкурентн|market entry|scaling|масштабуванн/i,
      weight: 3, priority: 3
    },
    product_management: {
      rx: /product management|управління продуктом|roadmap|дорожня карта|user story|користувацька історія|sprint|backlog|беклог|agile|scrum|product owner|власник продукту|\bMVP\b|product-market fit|customer development/i,
      weight: 3, priority: 3
    }
  };

  function detectDomain(text) {
    let best = 'general', bestScore = 0;
    for (const [domain, cfg] of Object.entries(DOMAIN_PATTERNS)) {
      const matches = (text.match(cfg.rx) || []).length;
      if (matches > 0) {
        const score = matches * cfg.weight - cfg.priority;
        if (score > bestScore) { bestScore = score; best = domain; }
      }
    }
    return best;
  }

  /* ── Expert Role Library (mirrors ExpertRoles in python_core) ── */
  const EXPERT_ROLES = {
    intelligence_analysis: {
      uk: `Старший аналітик розвідки (Senior Intelligence Analyst)

**Експертиза:**
- 20+ років досвіду в OSINT, стратегічній розвідці та геополітичному аналізі
- Глибоке розуміння Structured Analytic Techniques (SAT)
- Досвід роботи з відкритими та закритими джерелами інформації
- Експертиза в аналізі загроз та ризиків

**Повноваження:**
- Проводити повний аналітичний цикл: збір → обробка → аналіз → оцінка → прогноз
- Застосовувати методики ACH, Red Team, Key Assumptions Check
- Оцінювати достовірність джерел та інформації
- Розробляти сценарні прогнози та ризик-матриці

**Методологічний підхід:**
- Чітке розрізнення: Факт / Оцінка / Припущення / Прогноз
- Застосування Structured Analytic Techniques
- Явне зазначення рівнів достовірності (Probability Yardstick)
- Виявлення інформаційних прогалин та альтернативних гіпотез`,
      en: `Senior Intelligence Analyst

**Expertise:**
- 20+ years in OSINT, strategic intelligence, and geopolitical analysis
- Deep understanding of Structured Analytic Techniques (SAT)
- Experience with open and classified intelligence sources
- Expertise in threat and risk analysis

**Authority:**
- Conduct full analytical cycle: collection → processing → analysis → assessment → forecast
- Apply ACH, Red Team, Key Assumptions Check methodologies
- Assess source and information reliability
- Develop scenario forecasts and risk matrices

**Methodological Approach:**
- Clear distinction: Fact / Assessment / Assumption / Forecast
- Application of Structured Analytic Techniques
- Explicit confidence levels using Probability Yardstick
- Information gap identification and alternative hypotheses`
    },
    osint: {
      uk: `Старший спеціаліст з OSINT та розслідувань

**Експертиза:**
- 15+ років досвіду в OSINT та цифрових розслідуваннях
- Експертиза в геолокації, аналізі соціальних мереж та верифікації
- Досвід роботи з даними з відкритих джерел

**Повноваження:**
- Проводити комплексні OSINT-розслідування
- Верифікувати інформацію з відкритих джерел
- Аналізувати соціальні медіа та цифрові сліди

**Методологічний підхід:**
- Систематичний збір та аналіз даних
- Кросс-верифікація джерел
- Документування процесу розслідування`,
      en: `Senior OSINT and Investigations Specialist

**Expertise:**
- 15+ years in OSINT and digital investigations
- Geolocation, social media analysis, and verification expertise
- Open source data collection experience

**Authority:**
- Conduct comprehensive OSINT investigations
- Verify information from open sources
- Analyze social media and digital footprints

**Methodological Approach:**
- Systematic data collection and analysis
- Cross-source verification
- Investigation process documentation`
    },
    strategic_risk: {
      uk: `Старший експерт зі стратегічних ризиків

**Експертиза:**
- 15+ років у стратегічному ризик-менеджменті
- Сценарне планування та кризовий менеджмент
- Розробка стратегій пом'якшення ризиків

**Повноваження:**
- Проводити комплексну оцінку стратегічних ризиків
- Розробляти сценарні плани (best/base/worst case)
- Визначати ключові індикатори ризиків

**Методологічний підхід:**
- Ідентифікація та класифікація ризиків
- Кількісна та якісна оцінка впливу
- Сценарне моделювання та стрес-тестування`,
      en: `Senior Strategic Risk Expert

**Expertise:**
- 15+ years in strategic risk management
- Scenario planning and crisis management
- Risk mitigation strategy development

**Authority:**
- Conduct comprehensive strategic risk assessment
- Develop scenario plans (best/base/worst case)
- Define key risk indicators

**Methodological Approach:**
- Risk identification and classification
- Quantitative and qualitative impact assessment
- Scenario modeling and stress testing`
    },
    medical_diagnostics: {
      uk: `Діагност-клініцист, MD, PhD

**Експертиза:**
- 20+ років клінічної практики
- Evidence-Based Medicine (EBM) експертиза
- Диференційна діагностика складних випадків
- Робота з клінічними настановами (WHO, CDC, EMA)

**Повноваження:**
- Проводити повний діагностичний цикл
- Оцінювати рівень доказовості (Grade A/B/C)
- Виявляти "червоні прапорці" (red flags)

**Методологічний підхід:**
- Систематичний збір анамнезу
- Структурована диференційна діагностика
- Оцінка ризиків та переваг лікування`,
      en: `Clinician-Diagnostician, MD, PhD

**Expertise:**
- 20+ years of clinical practice
- Evidence-Based Medicine (EBM) expertise
- Differential diagnosis of complex cases
- Clinical guidelines (WHO, CDC, EMA)

**Authority:**
- Conduct complete diagnostic cycle
- Assess evidence levels (Grade A/B/C)
- Identify red flags

**Methodological Approach:**
- Systematic history collection
- Structured differential diagnosis
- Risk-benefit treatment assessment`
    },
    cybersecurity: {
      uk: `Старший експерт з кібербезпеки / Penetration Tester

**Експертиза:**
- 15+ років у кібербезпеці та тестуванні на проникнення
- Сертифікації: OSCP, CEH, CISSP
- Експертиза в MITRE ATT&CK, STRIDE, CVSS

**Повноваження:**
- Проводити повний цикл оцінки безпеки
- Виконувати тестування на проникнення
- Оцінювати вразливості за CVSS

**Методологічний підхід:**
- Систематичне картування поверхні атаки
- Моделювання загроз (STRIDE/MITRE ATT&CK)
- Документування кроків та доказів`,
      en: `Senior Cybersecurity Expert / Penetration Tester

**Expertise:**
- 15+ years in cybersecurity and penetration testing
- Certifications: OSCP, CEH, CISSP
- MITRE ATT&CK, STRIDE, CVSS expertise

**Authority:**
- Conduct full security assessment cycle
- Execute penetration testing
- Assess vulnerabilities via CVSS

**Methodological Approach:**
- Systematic attack surface mapping
- Threat modeling (STRIDE/MITRE ATT&CK)
- Step and evidence documentation`
    },
    financial_analysis: {
      uk: `Старший фінансовий аналітик / CFA

**Експертиза:**
- 15+ років у фінансовому аналізі та моделюванні
- Сертифікація CFA
- Експертиза в оцінці активів та інвестиціях

**Повноваження:**
- Проводити повний фінансовий аналіз
- Створювати фінансові моделі (DCF, comparables)
- Розробляти сценарії (bull/base/bear)

**Методологічний підхід:**
- Явне зазначення всіх припущень моделі
- Аналіз чутливості до ключових параметрів
- Оцінка систематичних та ідіосинкратичних ризиків`,
      en: `Senior Financial Analyst / CFA

**Expertise:**
- 15+ years in financial analysis and modeling
- CFA certification
- Asset valuation and investment expertise

**Authority:**
- Conduct full financial analysis
- Create financial models (DCF, comparables)
- Develop scenarios (bull/base/bear)

**Methodological Approach:**
- Explicit model assumption specification
- Sensitivity analysis on key parameters
- Systematic and idiosyncratic risk assessment`
    },
    legal_analysis: {
      uk: `Старший юридичний консультант / Адвокат

**Експертиза:**
- 15+ років юридичної практики
- Правовий аналіз та стратегія
- Робота з нормативно-правовими актами та прецедентами

**Повноваження:**
- Проводити комплексний правовий аналіз
- Аналізувати правові ризики
- Розробляти правові позиції

**Методологічний підхід:**
- Чітке зазначення юрисдикції
- Посилання на конкретні норми та статті
- Аналіз релевантної судової практики`,
      en: `Senior Legal Consultant / Attorney

**Expertise:**
- 15+ years of legal practice
- Legal analysis and strategy
- Regulatory and precedent work

**Authority:**
- Conduct comprehensive legal analysis
- Analyze legal risks and their probability
- Develop legal positions

**Methodological Approach:**
- Clear jurisdiction specification
- Specific statute and article references
- Relevant case law analysis`
    },
    programming: {
      uk: `Старший Software Engineer / Tech Lead

**Експертиза:**
- 15+ років розробки програмного забезпечення
- Архітектура систем, SOLID, DRY, clean code
- Досвід технічного лідерства

**Повноваження:**
- Проектувати архітектуру систем
- Писати робочий, протестований код
- Оцінювати складність та trade-offs

**Методологічний підхід:**
- Аналіз edge cases, error handling, performance
- Вибір архітектурного патерну з обґрунтуванням
- Unit tests для критичних шляхів`,
      en: `Senior Software Engineer / Tech Lead

**Expertise:**
- 15+ years of software development
- System architecture, SOLID, DRY, clean code
- Technical leadership experience

**Authority:**
- Design system architecture
- Write working, tested code
- Assess complexity and trade-offs

**Methodological Approach:**
- Edge cases, error handling, performance analysis
- Architecture pattern selection with justification
- Unit tests for critical paths`
    },
    scientific_research: {
      uk: `Дослідник / Науковий співробітник, PhD

**Експертиза:**
- 15+ років наукових досліджень
- Методологія досліджень, рецензовані публікації

**Повноваження:**
- Проектувати та проводити наукові дослідження
- Аналізувати емпіричні дані
- Перевіряти та відтворювати результати

**Методологічний підхід:**
- Чітке формулювання гіпотез
- Статистичний аналіз з оцінкою значущості
- Розрізнення кореляції та причинності`,
      en: `Research Scientist / PhD

**Expertise:**
- 15+ years of scientific research
- Research methodology, peer-reviewed publications

**Authority:**
- Design and conduct scientific research
- Analyze empirical data
- Verify and reproduce results

**Methodological Approach:**
- Clear hypothesis formulation
- Statistical analysis with significance assessment
- Correlation vs causation distinction`
    },
    data_science: {
      uk: `Lead Data Scientist

**Експертиза:**
- 10+ років у Data Science та Machine Learning
- Статистика, моделі ML, їх інтерпретація

**Повноваження:**
- Проводити повний цикл Data Science проектів
- Розробляти та валідувати моделі ML
- Впроваджувати рішення в production

**Методологічний підхід:**
- EDA: розподіл, missing values, outliers, кореляції
- Baseline модель перед складними підходами
- Validation: cross-validation, no leakage, правильна метрика`,
      en: `Lead Data Scientist

**Expertise:**
- 10+ years in Data Science and Machine Learning
- Statistics, ML models, and interpretability

**Authority:**
- Conduct full Data Science project cycle
- Develop and validate ML models
- Deploy solutions to production

**Methodological Approach:**
- EDA: distribution, missing values, outliers, correlations
- Baseline model before complex approaches
- Validation: cross-validation, no leakage, relevant metric`
    },
    business_strategy: {
      uk: `Старший стратег бізнесу / MBA

**Експертиза:**
- 15+ років у стратегічному консалтингу
- MBA, досвід McKinsey/BCG frameworks

**Повноваження:**
- Розробляти бізнес-стратегії
- Проводити стратегічний аналіз (SWOT, Porter's Five Forces)
- Оцінювати ринкові можливості

**Методологічний підхід:**
- Структурування проблем через McKinsey/BCG frameworks
- Аналіз з першопринципів
- Розгляд альтернативних стратегій та trade-offs`,
      en: `Senior Business Strategist / MBA

**Expertise:**
- 15+ years in strategic consulting
- MBA, McKinsey/BCG frameworks experience

**Authority:**
- Develop business strategies
- Conduct strategic analysis (SWOT, Porter's Five Forces)
- Assess market opportunities

**Methodological Approach:**
- Problem structuring via McKinsey/BCG frameworks
- First principles and data-driven analysis
- Alternative strategy and trade-off consideration`
    },
    product_management: {
      uk: `Senior Product Manager

**Експертиза:**
- 10+ років у продуктовому менеджменті
- Agile, Scrum, MVP розробка

**Повноваження:**
- Визначати продуктову стратегію та дорожню карту
- Управляти продуктовим беклогом
- Координувати команди розробки

**Методологічний підхід:**
- Розробка користувацьких історій та вимог
- Пріоритезація функціоналу (MoSCoW, RICE)
- Визначення та моніторинг KPI продукту`,
      en: `Senior Product Manager

**Expertise:**
- 10+ years in product management
- Agile, Scrum, MVP development expertise

**Authority:**
- Define product strategy and roadmap
- Manage product backlog
- Coordinate development teams

**Methodological Approach:**
- User story and requirement development
- Feature prioritization (MoSCoW, RICE)
- Product KPI definition and monitoring`
    },
    general: {
      uk: `Універсальний експерт-консультант

**Експертиза:**
- Широка міждисциплінарна ерудиція
- Аналітичне мислення та практичний підхід

**Повноваження:**
- Аналізувати запити різної складності
- Надавати структуровані, практичні відповіді

**Методологічний підхід:**
- Аналіз запиту перед відповіддю
- Підкріплення тверджень прикладами або даними
- Явне зазначення обмежень та невизначеностей`,
      en: `Versatile Expert Consultant

**Expertise:**
- Broad interdisciplinary knowledge
- Analytical thinking and practical approach

**Authority:**
- Analyze various complexity requests
- Provide structured, practical responses

**Methodological Approach:**
- Request analysis before responding
- Claim support with examples or data
- Explicit limitation and uncertainty identification`
    }
  };

  function getRole(domain, lang) {
    const r = EXPERT_ROLES[domain] || EXPERT_ROLES.general;
    return r[lang] || r.en;
  }

  /* ── Probability Yardstick (new) ─────────────────────────────── */
  const PROBABILITY_YARDSTICK = {
    uk: `## Шкала ймовірностей (Probability Yardstick)

Використовуй стандартизовані формулювання для всіх оцінок ймовірності:

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
3. Ключовим припущенням, на якому ґрунтується оцінка`,

    en: `## Probability Yardstick

Use standardized language for ALL probability assessments:

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
3. The key assumption underlying the estimate`
  };

  /* ── Examples Clause Library (new) ──────────────────────────── */
  const EXAMPLES_CLAUSE = {
    intelligence_analysis: {
      uk: `## Приклади якісного виводу

**Приклад 1 — правильне зазначення факту з джерелом:**
> "За даними Reuters від 14 червня 2025 р. (Source: Reuters, Moderate reliability), угруповання X перемістило не менше 3 батальйонів у напрямку Y. **Оцінка**: Ймовірно (65–70%), що це є підготовкою до наступальної операції протягом 30 днів. **Ключове припущення**: збереження поточного темпу постачання."

**Приклад 2 — правильне зазначення невизначеності:**
> "Інформація щодо намірів командування є суперечливою між джерелами A і B. **Рівень достовірності**: Low. **Вплив на аналіз**: знижує впевненість у Сценарії 2 з 'Ймовірно' до 'Приблизно рівні шанси'. **Рекомендовано**: збір додаткових даних із джерела C для верифікації."`,
      en: `## Examples of Quality Output

**Example 1 — correct fact with source citation:**
> "According to Reuters, June 14 2025 (Source: Reuters, Moderate reliability), group X relocated at least 3 battalions toward Y. **Assessment**: Likely (65–70%) this constitutes preparation for an offensive operation within 30 days. **Key assumption**: current supply tempo is maintained."

**Example 2 — correct uncertainty disclosure:**
> "Intelligence regarding command intent is conflicting between sources A and B. **Reliability level**: Low. **Analytical impact**: reduces confidence in Scenario 2 from 'Likely' to 'About even odds'. **Recommended**: collect additional data from source C for verification."`
    },
    medical_diagnostics: {
      uk: `## Приклади якісного виводу

**Приклад 1 — диференційний діагноз з рівнями доказовості:**
> "Найімовірніший діагноз: гострий апендицит (Grade A, на підставі RCT-даних — Alvarado score ≥7). Альтернатива: оваріальна киста з торсією (Grade B, когортні дослідження). **Червоні прапорці**: перитонеальні симптоми — негайна консультація хірурга."

**Приклад 2 — правильне зазначення обмежень:**
> "Ця відповідь носить інформаційний характер і не замінює очну консультацію лікаря. Рівень доказовості рекомендацій: Grade B. Для остаточного діагнозу необхідні: OAK, УЗД черевної порожнини, огляд хірурга."`,
      en: `## Examples of Quality Output

**Example 1 — differential diagnosis with evidence levels:**
> "Most probable diagnosis: acute appendicitis (Grade A, based on RCT data — Alvarado score ≥7). Alternative: ovarian cyst with torsion (Grade B, cohort studies). **Red flags**: peritoneal signs — immediate surgical consultation."

**Example 2 — correct limitation disclosure:**
> "This response is informational and does not replace in-person medical consultation. Evidence level: Grade B. For definitive diagnosis: CBC, abdominal ultrasound, surgical examination are required."`
    },
    financial_analysis: {
      uk: `## Приклади якісного виводу

**Приклад 1 — оцінка з явними припущеннями:**
> "DCF-оцінка: $42–48/акція (Base case, WACC=9.5%, Terminal growth=2.5%). Bull case ($55): зниження WACC до 8% при зростанні ринку. Bear case ($32): стиснення маржі на 200 bps. **Чутливість**: зміна WACC на 1% → зміна оцінки на ±$7."

**Приклад 2 — правильне зазначення ризиків:**
> "Ця відповідь є аналітичною, не є інвестиційною рекомендацією. Ключові ризики: регуляторні зміни (High impact, Moderate probability), валютний ризик (Moderate impact, High probability)."`,
      en: `## Examples of Quality Output

**Example 1 — valuation with explicit assumptions:**
> "DCF valuation: $42–48/share (Base case, WACC=9.5%, Terminal growth=2.5%). Bull case ($55): WACC compression to 8% with market expansion. Bear case ($32): margin compression of 200 bps. **Sensitivity**: 1% WACC change → ±$7 valuation change."

**Example 2 — correct risk disclosure:**
> "This response is analytical only, not an investment recommendation. Key risks: regulatory changes (High impact, Moderate probability), FX risk (Moderate impact, High probability)."`
    },
    cybersecurity: {
      uk: `## Приклади якісного виводу

**Приклад 1 — вразливість з CVSS:**
> "Виявлена вразливість: SQL Injection у /api/users (CVSS 9.1 — Critical). **Доказ**: blind SQLi через параметр 'id', підтверджено Burp Suite. **Рекомендація**: parameterized queries, WAF rule, patch до 48 годин."

**Приклад 2 — обмеження scope:**
> "Аналіз проведено в межах узгодженого scope (IP-діапазон X.X.X.0/24). Позаscope системи не тестувалися. Всі дії задокументовані з timestamp."`,
      en: `## Examples of Quality Output

**Example 1 — vulnerability with CVSS:**
> "Identified vulnerability: SQL Injection in /api/users (CVSS 9.1 — Critical). **Evidence**: blind SQLi via 'id' parameter, confirmed via Burp Suite. **Recommendation**: parameterized queries, WAF rule, patch within 48 hours."

**Example 2 — scope boundary:**
> "Analysis conducted within agreed scope (IP range X.X.X.0/24). Out-of-scope systems were not tested. All actions documented with timestamps."`
    },
    programming: {
      uk: `## Приклади якісного виводу

**Приклад 1 — відповідь на кодовий запит:**
> "Вибрано підхід: binary search (O(log n)) замість linear scan (O(n)) — обґрунтування: масив відсортований, що дозволяє використати розподіл навпіл. Edge cases: порожній масив → return -1, один елемент → порівняння без рекурсії."

**Приклад 2 — trade-off аналіз:**
> "Варіант A (Redis cache): latency <5ms, складність інтеграції — середня. Варіант B (in-memory): latency <1ms, не персистентний між рестартами. **Рекомендація**: Redis для production з TTL=300s."`,
      en: `## Examples of Quality Output

**Example 1 — code solution response:**
> "Chosen approach: binary search (O(log n)) over linear scan (O(n)) — rationale: array is sorted, enabling halving. Edge cases: empty array → return -1, single element → compare without recursion."

**Example 2 — trade-off analysis:**
> "Option A (Redis cache): latency <5ms, moderate integration complexity. Option B (in-memory): latency <1ms, not persistent across restarts. **Recommendation**: Redis for production with TTL=300s."`
    },
    general: {
      uk: `## Приклади якісного виводу

**Приклад 1 — структурована відповідь:**
> "**Контекст**: [коротко сформулюй суть проблеми]. **Аналіз**: [розгляд з доказами]. **Рекомендація**: [конкретна дія з обґрунтуванням]. **Обмеження**: [що невідомо або поза scope]."

**Приклад 2 — зазначення невизначеності:**
> "Дані щодо X суперечливі в доступних джерелах. Висновок базується на джерелах A і B (Moderate reliability). Для підвищення впевненості рекомендую верифікувати через [джерело]."`,
      en: `## Examples of Quality Output

**Example 1 — structured response:**
> "**Context**: [briefly state the problem]. **Analysis**: [examination with evidence]. **Recommendation**: [specific action with rationale]. **Limitations**: [what is unknown or out of scope]."

**Example 2 — uncertainty disclosure:**
> "Data on X is conflicting across available sources. Conclusion is based on sources A and B (Moderate reliability). To increase confidence, recommend verification via [source]."`
    }
  };

  function getExamplesClause(domain, lang) {
    const ex = EXAMPLES_CLAUSE[domain] || EXAMPLES_CLAUSE.general;
    return ex[lang] || ex.en;
  }

  /* ── Domain-specific constraints ─────────────────────────────── */
  const DOMAIN_CONSTRAINTS = {
    intelligence_analysis: {
      uk: `- Використовуй ЛИШЕ відкриті джерела (open source only); жодних спекуляцій без доказової бази
- Кожне твердження ПОВИННО мати посилання на джерело у форматі (Source: [назва], [рівень достовірності])
- Застосовуй Probability Yardstick для ВСІХ оцінок ймовірності
- Чітко маркуй: [ФАКТ] / [ОЦІНКА] / [ПРИПУЩЕННЯ] / [ПРОГНОЗ]
- Будь-яка відсутня інформація = Information Gap з оцінкою впливу на висновки`,
      en: `- Use ONLY open sources (open source only); no speculation without evidence base
- Every claim MUST include a source reference in format (Source: [name], [reliability level])
- Apply Probability Yardstick for ALL probability assessments
- Clearly label: [FACT] / [ASSESSMENT] / [ASSUMPTION] / [FORECAST]
- Any missing information = Information Gap with impact assessment on conclusions`
    },
    medical_diagnostics: {
      uk: `- Дотримуйся EBM принципів; вказуй рівень доказовості (Grade A/B/C) для кожної рекомендації
- Виявляй та явно зазначай "червоні прапорці" (red flags)
- Ця відповідь є інформаційною і НЕ замінює консультацію лікаря
- Не ставь остаточний діагноз без повного клінічного огляду`,
      en: `- Follow EBM principles; state evidence level (Grade A/B/C) for each recommendation
- Identify and explicitly flag red flags
- This response is informational and does NOT replace medical consultation
- Do not render a definitive diagnosis without full clinical examination`
    },
    financial_analysis: {
      uk: `- Явно зазначай всі ключові припущення моделі
- Проводь аналіз чутливості для головних параметрів
- Ця відповідь є аналітичною і НЕ є інвестиційною рекомендацією
- Вказуй рівень ризику для кожного твердження`,
      en: `- Explicitly state all key model assumptions
- Conduct sensitivity analysis for main parameters
- This response is analytical and NOT an investment recommendation
- State risk level for each material claim`
    },
    legal_analysis: {
      uk: `- Явно зазначай юрисдикцію для кожного аналізу
- Посилайся на конкретні статті законів та прецеденти
- Ця відповідь є інформаційною і НЕ є юридичною консультацією
- Рекомендуй звернення до кваліфікованого адвоката`,
      en: `- Explicitly state jurisdiction for each analysis
- Reference specific statutes and precedents
- This response is informational and NOT legal advice
- Recommend consultation with a qualified attorney`
    },
    cybersecurity: {
      uk: `- Дій ВИКЛЮЧНО в межах узгодженого scope
- Документуй кожну дію з timestamp
- Оцінюй вразливості за CVSS v3.1
- Не розкривай техніки, що можуть бути використані для незаконних дій`,
      en: `- Act EXCLUSIVELY within agreed scope
- Document every action with timestamps
- Rate vulnerabilities per CVSS v3.1
- Do not disclose techniques that could be used for illegal actions`
    },
    programming: {
      uk: `- Пиши тільки робочий код; включай обробку помилок та edge cases
- Вказуй часову та просторову складність O(n)
- Додавай коментарі для нетривіальної логіки
- Зазначай залежності та версії`,
      en: `- Write only working code; include error handling and edge cases
- State time and space complexity O(n)
- Add comments for non-trivial logic
- Specify dependencies and versions`
    },
    general: {
      uk: `- Підкріплюй кожне ключове твердження джерелом або обґрунтуванням
- Чітко зазначай межі своїх знань та невизначеності
- Структуруй відповідь логічно з явними розділами`,
      en: `- Support every key claim with a source or rationale
- Clearly state knowledge boundaries and uncertainties
- Structure the response logically with explicit sections`
    }
  };

  function getConstraints(domain, lang) {
    const c = DOMAIN_CONSTRAINTS[domain] || DOMAIN_CONSTRAINTS.general;
    return c[lang] || c.en;
  }

  /* ── Report structure by domain ──────────────────────────────── */
  const REPORT_STRUCTURES = {
    intelligence_analysis: {
      uk: `### Структура звіту (обов'язкова)
1. **Executive Summary** — ключові висновки (2–3 речення)
2. **Current Context** — поточний стан та обстановка з джерелами
3. **Threat/Opportunity Assessment** — оцінка з Confidence Levels
4. **Scenario Matrix** — Сценарій A (Найімовірніший) / B (Альтернативний) / C (Найгірший) з ймовірностями за Probability Yardstick
5. **Indicators & Warnings** — конкретні індикатори зміни сценарію
6. **Risk Matrix** — Ймовірність × Вплив для кожного ризику
7. **Forecast** — прогноз на 30 / 90 / 180 днів
8. **Information Gaps** — що невідомо та як це впливає на висновки
9. **Sources & Methodology** — перелік джерел з рівнями достовірності
10. **Recommendations** — конкретні дії з пріоритетами`,
      en: `### Report Structure (mandatory)
1. **Executive Summary** — key findings (2–3 sentences)
2. **Current Context** — current state and environment with sources
3. **Threat/Opportunity Assessment** — assessment with Confidence Levels
4. **Scenario Matrix** — Scenario A (Most Likely) / B (Alternative) / C (Worst Case) with Probability Yardstick
5. **Indicators & Warnings** — specific indicators of scenario shift
6. **Risk Matrix** — Probability × Impact for each risk
7. **Forecast** — 30 / 90 / 180-day forecast
8. **Information Gaps** — what is unknown and impact on conclusions
9. **Sources & Methodology** — sources list with reliability levels
10. **Recommendations** — specific actions with priorities`
    },
    medical_diagnostics: {
      uk: `### Структура відповіді
1. **Клінічний портрет** — систематизований опис симптомів
2. **Диференційна діагностика** — гіпотези з Grade A/B/C та ймовірностями
3. **Рекомендовані дослідження** — діагностичний план
4. **Тактика лікування** — EBM-обґрунтована
5. **Red Flags** — симптоми, що потребують негайної допомоги
6. **Прогноз та спостереження**
7. **Застереження** — не замінює консультацію лікаря`,
      en: `### Response Structure
1. **Clinical Profile** — systematized symptom description
2. **Differential Diagnosis** — hypotheses with Grade A/B/C and probabilities
3. **Recommended Investigations** — diagnostic plan
4. **Treatment Approach** — EBM-justified
5. **Red Flags** — symptoms requiring immediate attention
6. **Prognosis and Follow-up**
7. **Disclaimer** — does not replace medical consultation`
    },
    general: {
      uk: `### Структура відповіді
1. **Контекст** — суть проблеми та обмеження
2. **Аналіз** — детальний розгляд з доказами
3. **Висновки** — ключові знахідки
4. **Рекомендації** — практичні кроки з пріоритетами
5. **Обмеження** — що поза scope або невідомо`,
      en: `### Response Structure
1. **Context** — problem statement and constraints
2. **Analysis** — detailed examination with evidence
3. **Findings** — key discoveries
4. **Recommendations** — prioritized practical steps
5. **Limitations** — what is out of scope or unknown`
    }
  };

  function getReportStructure(domain, lang) {
    const s = REPORT_STRUCTURES[domain] || REPORT_STRUCTURES.general;
    return s[lang] || s.en;
  }

  /* ── Anti-hallucination controls ─────────────────────────────── */
  const ANTI_HALLUCINATION = {
    uk: `## Контроль якості та антигалюцинація

- Якщо інформація невідома або непевна, прямо зазначай це: "[Інформація відсутня / Потрібна верифікація]"
- Не вигадуй факти, цифри, імена, дати або джерела
- Якщо запит виходить за межі компетенції — явно зазнач це
- Кожне ключове твердження = посилання на джерело або явне позначення як припущення
- Краще визнати невизначеність, ніж надати хибну впевненість`,
    en: `## Quality Control and Anti-Hallucination

- If information is unknown or uncertain, say so plainly: "[Information unavailable / Verification required]"
- Do not fabricate facts, numbers, names, dates, or sources
- If request is outside competence — state this explicitly
- Every key claim = source reference OR explicit labeling as assumption
- Better to acknowledge uncertainty than to provide false confidence`
  };

  /* ── Explicit output-language request detection ──────────────────
   * If the user's raw task text explicitly asks for a specific output
   * language (e.g. "українською мовою", "in English", "en español"),
   * that request OVERRIDES the #promptLang dropdown. Returns a lang
   * code from LANG_NAMES, or null when no explicit request is found. */
  // NOTE: \w does NOT match Cyrillic in JS, so use explicit Cyrillic ranges.
  const LANG_HINTS = [
    { code: 'uk', re: /україн[а-яіїєґ'’]*\s+мов|\b(?:in|into)\s+ukrainian\b|ukrainian\s+language/i },
    { code: 'es', re: /іспан[а-яіїєґ'’]*\s+мов|\b(?:in|into|en)\s+(?:spanish|español|espanol)\b|spanish\s+language/i },
    { code: 'en', re: /англ[а-яіїєґ'’]*\s+мов|\b(?:in|into)\s+english\b|english\s+language/i },
    { code: 'de', re: /німець[а-яіїєґ'’]*\s+мов|\b(?:in|into)\s+german\b|german\s+language/i },
    { code: 'fr', re: /францу[а-яіїєґ'’]*\s+мов|\b(?:in|into)\s+french\b|french\s+language/i },
    { code: 'pl', re: /польськ[а-яіїєґ'’]*\s+мов|\b(?:in|into)\s+polish\b|polish\s+language/i },
  ];
  function detectOutputLang(text) {
    if (!text) return null;
    for (const h of LANG_HINTS) if (h.re.test(text)) return h.code;
    return null;
  }

  /* ── Main system prompt builder ──────────────────────────────── */
  /**
   * finalizePrompt(text, docDesign) — post-process a model-written prompt:
   * strip code fences and emoji; if a document deliverable was requested but the
   * model dropped the design requirements, append them so they are never lost.
   */
  function finalizePrompt(text, docDesign) {
    let out = text.replace(/^```[a-z]*\n([\s\S]*?)\n```$/i, '$1');
    // strip emoji (keep © ® ™) and trailing spaces left behind
    out = out.replace(/(?![\u00A9\u00AE\u2122])[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
             .replace(/[ \t]+$/gm, '');
    // The design block may come back translated, so check for its distinctive,
    // language-neutral markers rather than exact text.
    const keptDocx = !/\.docx/.test(docDesign) || /1[.,]15/.test(out);
    const keptMd   = !/Markdown/.test(docDesign) || (/\bH1\b/.test(out) && /\bH2\b/.test(out));
    if (docDesign && !(keptDocx && keptMd && /emoji|емодзі/i.test(out))) {
      out += '\n\n<document_design>\n' + docDesign.trim() + '\n</document_design>';
    }
    return out.trim();
  }

  function buildSystemPrompt(domain, style, lang, docDesign = '') {
    const langName = LANG_NAMES[lang] || 'English';

    const styleGuide = {
      detailed:  'Thorough and well-structured; include every part listed in <prompt_structure>.',
      concise:   'Compact: about 250–400 words. Keep role, task, instructions, quality standards, output format and success criteria; omit context, methodology and examples.',
      expert:    'Assume a deeply expert reader. Add a key-assumptions check, competing hypotheses, a red-team pass and sensitivity analysis to the instructions.',
      creative:  'For creative work: focus on voice, tone, audience, originality and structure; replace analytical rigor (probability scales, confidence levels) with craft guidance.',
      technical: 'For engineering work: require complete runnable code, versions, edge cases, error handling, tests, run instructions and complexity notes.',
    }[style] || 'Clear, structured and professional.';

    const role        = getRole(domain, lang);
    const constraints = getConstraints(domain, lang);
    const structure   = getReportStructure(domain, lang);
    const antiHal     = ANTI_HALLUCINATION[lang] || ANTI_HALLUCINATION.en;
    const examples    = getExamplesClause(domain, lang);
    const analyticalDomains = ['intelligence_analysis', 'osint', 'strategic_risk',
                               'financial_analysis', 'medical_diagnostics', 'legal_analysis'];
    const yardstick = (analyticalDomains.includes(domain) && style !== 'creative')
      ? (PROBABILITY_YARDSTICK[lang] || PROBABILITY_YARDSTICK.en)
      : '';
    const withExamples = (style === 'detailed' || style === 'expert') && domain !== 'general';

    return `You are an expert prompt engineer who writes production-grade prompts for Anthropic's Claude models, following Anthropic's published prompt-engineering guidance.

<goal>
Turn the user's raw task (given in <user_task>) into ONE ready-to-use prompt for Claude that will get an excellent result on the first try. Detected domain: ${domain}.
</goal>

<prompt_structure>
Write the prompt in ${langName}; keep XML tag names in English. Use these parts, in this order:
1. A one-line directive that the whole answer must be written in ${langName}.
2. <role> — one sentence naming a specific expert role, plus up to four expertise bullets. Base it on this role and adapt it to the task:
${role}
3. <context> — why the task matters, who the audience is and how the result will be used. Infer this from the task; phrase inferences as working assumptions.
4. <task> — the user's task reproduced verbatim, without shortening or paraphrasing.
5. <instructions> — 5–10 numbered steps written specifically for this task (not generic advice). Work these domain constraints in where relevant:
${constraints}
   Include a step telling Claude to state assumptions explicitly and continue when information is missing (open questions go at the end), and a step to check the draft against <success_criteria> before finishing.
   Ask Claude to think the problem through step by step before writing (using extended thinking if available) and to put only the final result in the answer. Do not ask for a visible scratchpad.
6. <quality_standards> — grounding rules adapted from:
${antiHal}${yardstick ? `
   Include this probability scale for all likelihood statements:
${yardstick}` : ''}
7. <output_format> — the exact structure of the answer (adapt from the outline below, drop what does not apply), formatting rules and length guidance:
${structure}${docDesign ? `
   The task asks for a document deliverable. Include the following document-design requirements in <output_format>, translated into ${langName} and kept complete:
${docDesign}` : `
   Formatting: Markdown with ## sections, tables for comparisons, bold only for key terms, no emoji.`}
${withExamples ? `8. <examples> — present these as illustrations of the expected level of specificity (not content to copy):
${examples}
9.` : '8.'} <success_criteria> — 4–6 concrete, checkable criteria for a great answer${docDesign ? ', including that the document is polished, consistently styled and contains no emoji' : ''}.
${withExamples ? '10.' : '9.'} A final one-line instruction to complete the task in <task>.
</prompt_structure>

<writing_rules>
- Style of the prompt: ${styleGuide}
- Use calm, direct, specific language and explain the reason behind non-obvious rules. Avoid ALL-CAPS emphasis and shouted words such as MUST or CRITICAL: current Claude models follow plain instructions precisely and over-apply shouted ones.
- Phrase instructions positively (what to do), not only as prohibitions.
- Make every sentence specific to the user's task. Do not leave placeholders such as [X], [Result 1] or <insert>.
- Use no emoji anywhere in the prompt.
</writing_rules>

<response_rules>
Output only the prompt itself: no preamble, no commentary, no code fences.
</response_rules>`;
  }

  /* ── Main API call ───────────────────────────────────────────── */
  async function generatePrompt({ userText, style = 'detailed', lang = 'uk', onStatus, docDesign = '', domain: knownDomain = '' }) {
    if (!hasKey()) throw new Error('NO_API_KEY');

    // Prefer the domain from the PYTHON_CORE classifier (shared with the local engine)
    const domain   = knownDomain || detectDomain(userText);
    // An explicit output-language request inside the task text overrides the dropdown.
    const requested = detectOutputLang(userText);
    const outLang   = requested || lang;
    if (requested && requested !== lang) {
      console.info(`[DeepSeek] output language overridden by task text: ${lang} → ${outLang}`);
    }
    const system   = buildSystemPrompt(domain, style, outLang, docDesign);
    const langWord = LANG_NAMES[outLang] || 'English';

    const userMsg = `<user_task>
${userText}
</user_task>

Write the Claude prompt for this task now, in ${langWord}, following <prompt_structure> and <writing_rules>.`;

    if (onStatus) onStatus((window.Lang ? Lang.t('status.deepseekAnalyzing') : 'DeepSeek: analyzing domain') + ` «${domain}»…`);

    const resp = await chatRequest({
        model:       MODEL,
        temperature: 0.20,
        max_tokens:  4000,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: userMsg },
        ],
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${resp.status}`;
      if (resp.status === 401) throw new Error('INVALID_KEY');
      if (resp.status === 402) throw new Error('QUOTA_EXCEEDED');
      if (resp.status === 429) throw new Error('RATE_LIMIT');
      throw new Error(`DeepSeek API: ${msg}`);
    }

    const data   = await resp.json();
    let result = data?.choices?.[0]?.message?.content?.trim();
    if (!result) throw new Error('Порожня відповідь від DeepSeek');
    result = finalizePrompt(result, docDesign);

    return { result, domain, model: data.model, tokens: data.usage };
  }

  /* ── UI: API key banner ──────────────────────────────────────── */
  /* ── btnOpenApiKey visibility helpers ───────────────────────── */
  function _showBtnOpenApiKey(btn) { if (btn) btn.style.visibility = 'visible'; }
  function _hideBtnOpenApiKey(btn) { if (btn) btn.style.visibility = 'hidden';  }

  /* ── Styled API Key modal (no input in page → prevents browser pw manager) ── */
  // ── Custom providers storage (in addition to built-in deepseek/claude/gemini) ──
  const CUSTOM_PROVIDERS_LS_KEY = 'custom_ai_providers';
  function _loadCustomProviders() {
    try {
      const raw = localStorage.getItem(CUSTOM_PROVIDERS_LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function _saveCustomProviders(obj) {
    localStorage.setItem(CUSTOM_PROVIDERS_LS_KEY, JSON.stringify(obj));
  }

  async function appApiKeyModal(initialProvider) {
    const existing = document.getElementById('apiKeyModal');
    if (existing) existing.remove();

    // Sync ALL provider keys from DB → localStorage before rendering
    // so green indicators reflect the actual server state
    if (window.API?.isLoggedIn() && typeof syncKeysFromServer === 'function') {
      await syncKeysFromServer().catch(() => {});
    }

    // Pull custom provider definitions from the server first (source of truth,
    // survives browser cache clears / different devices). Merge into localStorage cache.
    if (window.API?.isLoggedIn()) {
      try {
        const jsToken = sessionStorage.getItem('_jsat') || '';
        const resp = await fetch('/api/custom-providers', {
          headers: { Authorization: 'Bearer ' + jsToken },
        });
        if (resp.ok) {
          const data = await resp.json();
          const fromServer = {};
          (data.providers || []).forEach(p => {
            fromServer[p.provider_key] = {
              label: p.label, prefix: p.prefix || '',
              hint: 'Custom provider', placeholder: (p.prefix || '') + 'xxxxxxxxxxxxxxxx',
            };
          });
          const existingLocal = _loadCustomProviders();
          _saveCustomProviders({ ...existingLocal, ...fromServer });
        }
      } catch {}
    }

    const BUILTIN_PROVIDERS = {
      deepseek: {
        label: 'DeepSeek', lsKey: LS_KEY,
        hint:    'Get your key at platform.deepseek.com → API Keys',
        prefix:  'sk-', placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        builtin: true,
      },
      claude: {
        label: 'Claude', lsKey: 'claude_api_key',
        hint:    'Get your key at console.anthropic.com → API Keys',
        prefix:  'sk-ant-', placeholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        builtin: true,
      },
      gemini: {
        label: 'Gemini', lsKey: 'gemini_api_key',
        hint:    'Get your key at aistudio.google.com → Get API Key',
        prefix:  '', placeholder: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        builtin: true,
      },
    };

    function getAllProviders() {
      const custom = _loadCustomProviders();
      const merged = { ...BUILTIN_PROVIDERS };
      Object.keys(custom).forEach(key => {
        merged[key] = { ...custom[key], lsKey: 'custom_' + key + '_api_key', builtin: false };
      });
      return merged;
    }

    let PROVIDERS = getAllProviders();
    let order = Object.keys(PROVIDERS);
    let activeProvider = initialProvider && PROVIDERS[initialProvider] ? initialProvider : (order[0] || 'deepseek');

    const T = k => (window.Lang ? Lang.t(k) : null);
    const cancelLabel = T('dialog.cancelBtn') || 'Cancel';

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id        = 'apiKeyModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(6,17,31,0.82)',
      'backdrop-filter:blur(6px)',
      '-webkit-backdrop-filter:blur(6px)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:20px', 'opacity:0', 'transition:opacity 0.2s ease',
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
      'background:linear-gradient(145deg,var(--bg-2,#132f4c),var(--bg-1,#0a1929))',
      'border:1px solid rgba(79,195,247,0.25)',
      'border-radius:18px',
      'box-shadow:0 24px 60px rgba(0,0,0,0.5)',
      'width:100%', 'max-width:480px',
      'display:flex', 'flex-direction:column',
      'overflow:hidden',
      'transform:translateY(12px) scale(0.97)',
      'transition:transform 0.25s cubic-bezier(0.34,1.4,0.64,1),opacity 0.2s ease'
    ].join(';');

    box.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;' +
          'padding:16px 20px 0;">' +
        '<span style="font-size:16px;font-weight:700;color:#81d4fa;">&#128273; API Keys</span>' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<button id="_akImport" title="Import keys from file" style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);' +
              'color:#90a4ae;font-size:13px;cursor:pointer;padding:5px 8px;border-radius:7px;transition:all 0.15s;">&#8595; Import</button>' +
          '<button id="_akExport" title="Export keys to file" style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);' +
              'color:#90a4ae;font-size:13px;cursor:pointer;padding:5px 8px;border-radius:7px;transition:all 0.15s;">&#8593; Export</button>' +
          '<button id="_akClose" style="background:none;border:none;color:#90a4ae;' +
              'font-size:22px;cursor:pointer;line-height:1;padding:2px 6px;' +
              'border-radius:6px;transition:all 0.15s;">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div id="_akTabsWrap" style="display:flex;flex-wrap:wrap;border-bottom:1px solid rgba(79,195,247,0.15);margin-top:14px;"></div>' +
      '<div id="_akBody" style="padding:20px 24px;"></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;padding:0 24px 22px;">' +
        '<button id="_akCancel" style="background:transparent;border:1px solid rgba(79,195,247,0.2);' +
            'color:#90a4ae;padding:10px 22px;border-radius:10px;' +
            'font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s;">' +
          cancelLabel + '</button>' +
        '<button id="_akSave" style="background:linear-gradient(135deg,#29b6f6,#4fc3f7);' +
            'color:#06111f;border:none;padding:10px 24px;border-radius:10px;' +
            'font-size:14px;font-weight:700;cursor:pointer;' +
            'box-shadow:0 4px 16px rgba(79,195,247,0.35);transition:all 0.15s;">' +
          '&#128190; <span id="_akSaveLabel">Save</span></button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      box.style.transform   = 'translateY(0) scale(1)';
      box.style.opacity     = '1';
    });

    const tabsWrap = box.querySelector('#_akTabsWrap');
    const bodyEl   = box.querySelector('#_akBody');
    const btnSave  = box.querySelector('#_akSave');
    const saveLbl  = box.querySelector('#_akSaveLabel');
    const btnCnl   = box.querySelector('#_akCancel');
    const btnCls   = box.querySelector('#_akClose');
    const btnImport = box.querySelector('#_akImport');
    const btnExport = box.querySelector('#_akExport');

    function renderTabs() {
      tabsWrap.innerHTML = '';
      order.forEach(p => {
        const cfg = PROVIDERS[p];
        // Check localStorage (already synced from DB via syncKeysFromServer on modal open)
        const hasLocal = !!localStorage.getItem(cfg.lsKey);
        // For DeepSeek also check whether the server proxy key is available
        const hasEnv = p === 'deepseek' && _serverKey;
        const has = hasLocal || hasEnv;
        const tab = document.createElement('button');
        tab.className = '_akTab';
        tab.dataset.provider = p;
        tab.style.cssText = 'flex:1;min-width:80px;padding:10px 8px;background:' +
          (p === activeProvider ? 'rgba(79,195,247,0.14)' : 'transparent') +
          ';border:none;border-bottom:2px solid ' + (p === activeProvider ? '#4fc3f7' : 'transparent') +
          ';color:' + (p === activeProvider ? '#4fc3f7' : '#90a4ae') +
          ';font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:5px;';
        // Green dot = key exists (from DB via localStorage sync)
        tab.innerHTML = cfg.label + (has
          ? ' <span title="Key configured" style="width:7px;height:7px;border-radius:50%;background:#66bb6a;display:inline-block;flex-shrink:0;"></span>'
          : ' <span title="No key" style="width:7px;height:7px;border-radius:50%;background:#546e7a;display:inline-block;flex-shrink:0;"></span>');
        tab.addEventListener('click', () => switchTab(p));
        tabsWrap.appendChild(tab);
      });
      // "+ Add" button
      const addBtn = document.createElement('button');
      addBtn.id = '_akAddProvider';
      addBtn.title = 'Add a new AI provider';
      addBtn.style.cssText = 'padding:10px 12px;background:transparent;border:none;border-bottom:2px solid transparent;' +
        'color:#66bb6a;font-size:18px;font-weight:700;cursor:pointer;transition:all 0.15s;';
      addBtn.textContent = '+';
      addBtn.addEventListener('click', showAddProviderForm);
      tabsWrap.appendChild(addBtn);
    }

    function showAddProviderForm() {
      bodyEl.innerHTML =
        '<div style="font-size:13px;font-weight:700;color:#81d4fa;margin-bottom:14px;">&#10133; Add New AI Provider</div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#90a4ae;margin-bottom:8px;">Provider Name</div>' +
        '<input id="_npName" type="text" placeholder="e.g. Mistral, GPT-4, Llama…" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);' +
            'border:1.5px solid rgba(79,195,247,0.2);border-radius:10px;color:#e3f2fd;font-size:13px;margin-bottom:14px;outline:none;box-sizing:border-box;">' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#90a4ae;margin-bottom:8px;">Key Prefix (optional)</div>' +
        '<input id="_npPrefix" type="text" maxlength="10" placeholder="e.g. sk- (max 10 chars, leave empty if none)" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);' +
            'border:1.5px solid rgba(79,195,247,0.2);border-radius:10px;color:#e3f2fd;font-size:13px;margin-bottom:14px;outline:none;box-sizing:border-box;">' +
        '<button id="_npCreate" style="width:100%;padding:11px;background:linear-gradient(135deg,#66bb6a,#81c784);color:#06111f;border:none;' +
            'border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">&#10003; Create Provider</button>';

      saveLbl.parentElement.style.display = 'none';
      btnSave.style.display = 'none';

      const nameInput = bodyEl.querySelector('#_npName');
      requestAnimationFrame(() => nameInput.focus());

      bodyEl.querySelector('#_npCreate').addEventListener('click', async () => {
        const label = nameInput.value.trim();
        if (!label) { nameInput.style.borderColor = '#ef5350'; return; }
        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (!key) { nameInput.style.borderColor = '#ef5350'; return; }
        const prefix = bodyEl.querySelector('#_npPrefix').value.trim().slice(0, 10);

        // Save locally (instant UI feedback) ...
        const custom = _loadCustomProviders();
        custom[key] = { label, prefix, hint: 'Custom provider', placeholder: (prefix || '') + 'xxxxxxxxxxxxxxxx' };
        _saveCustomProviders(custom);

        // ... AND persist on the server, so it survives cache clears and shows up
        // in the Scheduler's Target AI list even without a key being saved yet.
        if (window.API?.isLoggedIn()) {
          try {
            const jsToken = sessionStorage.getItem('_jsat') || '';
            await fetch('/api/custom-providers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jsToken },
              body: JSON.stringify({ provider_key: key, label, prefix }),
            });
          } catch {}
        }

        PROVIDERS = getAllProviders();
        order = Object.keys(PROVIDERS);
        activeProvider = key;
        renderTabs();
        btnSave.style.display = '';
        saveLbl.parentElement.style.display = '';
        renderTabBody(activeProvider);
        if (window.toast) toast('Provider "' + label + '" added', 'success');
      });
    }

    function renderTabBody(provider) {
      const cfg = PROVIDERS[provider];
      const currentKey  = localStorage.getItem(cfg.lsKey) || '';
      const hasExisting = !!currentKey;
      const maskedKey   = hasExisting ? currentKey.slice(0, 6) + '…' + currentKey.slice(-4) : '';

      btnSave.style.display = '';
      saveLbl.parentElement.style.display = '';
      saveLbl.textContent = hasExisting ? 'Update' : 'Save';

      bodyEl.innerHTML =
        '<div style="display:flex;align-items:center;gap:14px;' +
            'background:rgba(79,195,247,0.06);border:1px solid rgba(79,195,247,0.15);' +
            'border-radius:12px;padding:14px;margin-bottom:18px;">' +
          '<div style="width:48px;height:48px;border-radius:12px;flex-shrink:0;' +
              'background:linear-gradient(135deg,rgba(79,195,247,0.18),rgba(41,182,246,0.08));' +
              'border:1px solid rgba(79,195,247,0.2);display:flex;align-items:center;' +
              'justify-content:center;color:#81d4fa;">' +
            '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" ' +
                'stroke="currentColor" stroke-width="1.8" ' +
                'stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="3" y="11" width="18" height="11" rx="2"/>' +
              '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
            '</svg>' +
          '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:13px;font-weight:700;color:#81d4fa;">' +
              cfg.label + ' API Key' + '</div>' +
            '<div style="font-size:11px;color:#90a4ae;margin-top:3px;">' +
              cfg.hint + '</div>' +
          '</div>' +
          (cfg.builtin ? '' :
            '<button id="_akDeleteProvider" title="Remove this provider" style="background:rgba(239,83,80,0.1);border:1px solid rgba(239,83,80,0.3);' +
                'color:#ef5350;font-size:13px;cursor:pointer;padding:6px 10px;border-radius:8px;flex-shrink:0;">&#128465;</button>') +
        '</div>' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:0.07em;' +
            'text-transform:uppercase;color:#90a4ae;margin-bottom:8px;">' +
          'API Key' + '</div>' +
        '<div style="display:flex;align-items:center;gap:0;margin-bottom:' +
            (hasExisting ? '6px' : '0') + ';">' +
          '<input id="_akInput" type="search"' +
              ' placeholder="' + cfg.placeholder + '"' +
              ' autocomplete="off" autocorrect="off" autocapitalize="off"' +
              ' spellcheck="false" data-form-type="other"' +
              ' data-lpignore="true" data-1p-ignore="true"' +
              ' style="flex:1;background:rgba(255,255,255,0.05);' +
                  'border:1.5px solid rgba(79,195,247,0.2);border-radius:10px 0 0 10px;' +
                  'color:#e3f2fd;font-size:13px;font-family:monospace;padding:10px 12px;' +
                  'outline:none;-webkit-text-security:disc;text-security:disc;">' +
          '<button id="_akToggle"' +
              ' style="background:rgba(79,195,247,0.08);border:1.5px solid rgba(79,195,247,0.2);' +
                  'border-left:none;border-radius:0 10px 10px 0;color:#90a4ae;' +
                  'cursor:pointer;font-size:15px;padding:10px 12px;transition:all 0.15s;"' +
              ' title="Show / Hide">&#9900;</button>' +
        '</div>' +
        (hasExisting
          ? '<div style="font-size:11px;color:#90a4ae;">Current: <code style="color:#4fc3f7;">' + maskedKey + '</code></div>'
          : '');

      const input  = bodyEl.querySelector('#_akInput');
      const toggle = bodyEl.querySelector('#_akToggle');
      let _visible = false;
      toggle.addEventListener('click', () => {
        _visible = !_visible;
        input.style.webkitTextSecurity = _visible ? 'none' : 'disc';
        input.style.textSecurity       = _visible ? 'none' : 'disc';
        toggle.textContent = _visible ? '◉' : '◎';
      });
      if (hasExisting) input.value = currentKey;
      requestAnimationFrame(() => { input.focus(); input.select(); });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); saveKey(); }
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      });

      const delBtn = bodyEl.querySelector('#_akDeleteProvider');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          const custom = _loadCustomProviders();
          delete custom[provider];
          _saveCustomProviders(custom);
          localStorage.removeItem(cfg.lsKey);

          if (window.API?.isLoggedIn()) {
            try {
              const jsToken = sessionStorage.getItem('_jsat') || '';
              await fetch('/api/custom-providers/' + encodeURIComponent(provider), {
                method: 'DELETE',
                headers: { Authorization: 'Bearer ' + jsToken },
              });
            } catch {}
          }

          PROVIDERS = getAllProviders();
          order = Object.keys(PROVIDERS);
          activeProvider = order[0] || 'deepseek';
          renderTabs();
          renderTabBody(activeProvider);
          if (window.toast) toast('Provider removed', 'success');
        });
      }
    }

    function switchTab(provider) {
      activeProvider = provider;
      renderTabs();
      renderTabBody(provider);
    }

    function closeModal() {
      overlay.style.opacity = '0';
      box.style.transform   = 'translateY(12px) scale(0.97)';
      box.style.opacity     = '0';
      setTimeout(() => overlay.remove(), 220);
      _hideBtnOpenApiKey(document.getElementById('btnOpenApiKey'));
    }

    function saveKey() {
      const cfg   = PROVIDERS[activeProvider];
      const input = bodyEl.querySelector('#_akInput');
      if (!input) return; // Add-provider form is showing, not a key form
      const k     = input.value.trim();
      // Prefix check only enforced for the 3 built-in providers (deepseek/claude/gemini),
      // where the prefix is short and reliable. Custom providers skip this — users may
      // have accidentally saved a long string as "prefix" in the past, and a non-empty
      // key should always be accepted for them.
      const enforcePrefix = cfg.builtin && cfg.prefix;
      if (!k || (enforcePrefix && !k.startsWith(cfg.prefix))) {
        input.style.borderColor = 'var(--error,#ef5350)';
        input.style.boxShadow   = '0 0 0 3px rgba(239,83,80,0.18)';
        setTimeout(() => { input.style.borderColor = ''; input.style.boxShadow = ''; }, 1500);
        return;
      }
      if (activeProvider === 'deepseek') {
        setKey(k);
        refreshBalance();
      } else {
        localStorage.setItem(cfg.lsKey, k);
      }
      // Sync to server so Scheduler can use it for background jobs — works for
      // ALL providers (built-in deepseek/claude/gemini and custom ones alike)
      if (window.API?.isLoggedIn()) {
        const jsToken = sessionStorage.getItem('_jsat') || '';
        fetch('/api/user-keys/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jsToken },
          body: JSON.stringify({
            providers: {
              [activeProvider]: { label: cfg.label, key: k, prefix: cfg.prefix || '', builtin: !!cfg.builtin },
            },
          }),
        }).catch(() => {});
      }
      if (window.toast) toast(cfg.label + ' API Key saved', 'success');
      renderTabs();
      _updateBannerStatus();
      closeModal();
    }

    async function exportKeys() {
      let providersData = {};

      // Pull the full set of keys from the server (covers all devices/sessions for this user)
      if (window.API?.isLoggedIn()) {
        try {
          const jsToken = sessionStorage.getItem('_jsat') || '';
          const resp = await fetch('/api/user-keys/all', {
            headers: { Authorization: 'Bearer ' + jsToken },
          });
          if (resp.ok) {
            const data = await resp.json();
            providersData = data.providers || {};
          }
        } catch {}
      }

      // Merge in any local-only keys (e.g. custom providers not yet synced, or not logged in)
      order.forEach(p => {
        if (providersData[p]) return; // server value wins
        const cfg = PROVIDERS[p];
        const val = localStorage.getItem(cfg.lsKey);
        if (val) providersData[p] = { label: cfg.label, key: val, prefix: cfg.prefix || '', builtin: !!cfg.builtin };
      });

      const custom = _loadCustomProviders();
      const payload = { providers: providersData, customProviderDefs: custom, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = 'jsprompt_api_keys_' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const count = Object.keys(providersData).length;
      if (window.toast) toast('✓ Exported ' + count + ' key(s) to file', 'success');
    }

    function importKeys() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const payload = JSON.parse(reader.result);
            // Restore custom provider definitions first
            if (payload.customProviderDefs) {
              const existing = _loadCustomProviders();
              _saveCustomProviders({ ...existing, ...payload.customProviderDefs });
            }
            // Restore keys — locally first (always works, even offline)
            const providers = payload.providers || payload; // support flat format too
            let count = 0;
            Object.keys(providers).forEach(p => {
              const entry = providers[p];
              const keyVal = typeof entry === 'string' ? entry : entry.key;
              if (!keyVal) return;
              const lsKey = p === 'deepseek' ? LS_KEY
                          : p === 'claude'   ? 'claude_api_key'
                          : p === 'gemini'   ? 'gemini_api_key'
                          : 'custom_' + p + '_api_key';
              localStorage.setItem(lsKey, keyVal);
              count++;
            });

            // Also push the full set to the server, so all of the user's keys
            // (including custom providers) are available for Scheduled Jobs
            if (window.API?.isLoggedIn()) {
              try {
                const jsToken = sessionStorage.getItem('_jsat') || '';
                await fetch('/api/user-keys/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jsToken },
                  body: JSON.stringify({ providers }),
                });
              } catch {}
            }

            PROVIDERS = getAllProviders();
            order = Object.keys(PROVIDERS);
            activeProvider = order[0] || 'deepseek';
            renderTabs();
            renderTabBody(activeProvider);
            if (window.toast) toast('✓ Imported ' + count + ' key(s) from file', 'success');
          } catch (err) {
            if (window.toast) toast('✗ Invalid file: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
      fileInput.click();
    }

    btnSave.addEventListener('click', saveKey);
    btnCnl.addEventListener('click',  closeModal);
    btnCls.addEventListener('click',  closeModal);
    btnExport.addEventListener('click', exportKeys);
    btnImport.addEventListener('click', importKeys);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    renderTabs();
    renderTabBody(activeProvider);
  }



  /* ── Update status in the banner (no input — just masked key display) ── */
  function _updateBannerStatus() {
    const k       = getKey();
    const statusEl = document.getElementById('apiKeyStatus');
    const hintEl   = document.getElementById('apiKeyHint');
    const banner   = document.getElementById('apiKeyBanner');
    const btnSave  = document.getElementById('btnSaveApiKey');
    const T = key => (window.Lang ? Lang.t(key) : null);
    if (statusEl) {
      statusEl.textContent = k
        ? k.slice(0,6) + '…' + k.slice(-4)
        : (T('apikey.modal.noKey') || 'No key set');
      statusEl.style.color      = k ? 'var(--ok,#66bb6a)' : 'var(--text-dim,#90a4ae)';
      statusEl.style.fontFamily = 'monospace';
      statusEl.style.fontSize   = '13px';
    }
    if (hintEl) {
      hintEl.textContent = k
        ? (T('apikey.modal.saved') || 'Key saved in localStorage')
        : (T('apikey.modal.hint')  || 'Press Save to enter your key');
    }
    if (banner) banner.classList.toggle('has-key', !!k);
    if (btnSave) {
      btnSave.textContent = k
        ? (T('apikey.btn.update') || 'Update')
        : (T('apikey.btn.save')   || 'Save');
    }
  }

  function initApiKeyBanner() {
    const banner   = document.getElementById('apiKeyBanner');
    const btnSave  = document.getElementById('btnSaveApiKey');
    const btnClose = document.getElementById('btnCloseApiKey');
    const btnOpen  = document.getElementById('btnOpenApiKey');
    if (!banner) return;

    // Always hidden on startup
    _hideBtnOpenApiKey(btnOpen);
    _updateBannerStatus();

    function closeBanner() {
      banner.classList.add('hidden');
      _hideBtnOpenApiKey(btnOpen);
    }

    // Load key from server .env → update status, keep banner hidden
    fetchKeyFromEnv().then(() => {
      _updateBannerStatus();
      closeBanner();
    });

    // "Save"/"Update" button in banner → open modal
    if (btnSave) btnSave.addEventListener('click', () => {
      closeBanner();
      appApiKeyModal();
      _showBtnOpenApiKey(btnOpen);
    });

    // × button
    if (btnClose) btnClose.addEventListener('click', closeBanner);

    // btnOpen (Ctrl+Shift+K trigger) → open modal directly
    if (btnOpen) btnOpen.addEventListener('click', appApiKeyModal);
  }

  /* ── UI: Engine tabs ─────────────────────────────────────────── */
  function initEngineTabs() {
    const tabs = document.querySelectorAll('.engine-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.engine === 'deepseek' && !hasKey()) {
          const banner = document.getElementById('apiKeyBanner');
          if (banner) banner.classList.remove('hidden');
        }
      });
    });
  }

  function getActiveEngine() {
    const active = document.querySelector('.engine-tab.active');
    return active ? active.dataset.engine : 'deepseek';
  }

  /* ── Error → user message ────────────────────────────────────── */
  function friendlyError(err) {
    const T = (k, fallback) => (window.Lang ? Lang.t(k) : null) || fallback;
    const map = {
      'NO_API_KEY':     T('apikey.err.noKey',    'Enter DeepSeek API Key'),
      'INVALID_KEY':    T('apikey.err.invalid',  'Invalid API Key — please check and update'),
      'QUOTA_EXCEEDED': T('apikey.err.quota',    'DeepSeek quota exceeded — top up your balance'),
      'RATE_LIMIT':     T('apikey.err.rateLimit','Too many requests — wait a minute'),
    };
    return map[err.message] || err.message;
  }


  /* ── Balance API ─────────────────────────────────────────────── */
  const BALANCE_ENDPOINT = '/api/deepseek/balance';  // Proxied through our server to avoid CORS
  const BALANCE_CACHE_MS = 60_000;   // re-fetch at most once per minute
  let _balanceCache = null;          // { ts, balance, currency, available }

  /**
   * fetchBalance() — query DeepSeek account balance.
   * Returns { balance, currency, available } or null on error.
   * Results are cached for BALANCE_CACHE_MS to avoid hammering the API.
   */
  async function fetchBalance() {
    const key = getKey();
    if (!hasKey()) return null;

    // Return cached result if still fresh
    if (_balanceCache && (Date.now() - _balanceCache.ts) < BALANCE_CACHE_MS) {
      return _balanceCache;
    }

    try {
      const jsToken = sessionStorage.getItem('_jsat') || '';
      const resp = await fetch(BALANCE_ENDPOINT, {
        method: 'GET',
        cache:  'no-store',
        headers: {
          'Authorization': jsToken ? `Bearer ${jsToken}` : `Bearer ${key}`,
          'Accept':        'application/json',
        },
      });

      if (!resp.ok) {
        // 401 = invalid key; surface this but don't throw
        if (resp.status === 401) return { error: 'INVALID_KEY' };
        if (resp.status === 429) return { error: 'RATE_LIMIT' };
        return { error: `HTTP_${resp.status}` };
      }

      const data = await resp.json();

      // Official DeepSeek API response (GET /user/balance):
      // {
      //   "is_available": true,
      //   "balance_infos": [{
      //     "currency": "USD",
      //     "total_balance": "10.00",      ← granted + topped_up
      //     "granted_balance": "0.00",     ← promo/free credits
      //     "topped_up_balance": "10.00"   ← paid top-up
      //   }]
      // }
      let balance = null, currency = 'USD', available = null,
          granted = null, toppedUp = null, isAvailable = true;

      if (data.is_available !== undefined) isAvailable = data.is_available;

      if (data.balance_infos && data.balance_infos.length > 0) {
        const info = data.balance_infos[0];
        currency  = info.currency       || 'USD';
        balance   = parseFloat(info.total_balance    ?? 0);
        granted   = parseFloat(info.granted_balance  ?? 0);
        toppedUp  = parseFloat(info.topped_up_balance ?? 0);
        available = balance;   // total_balance = spendable total
      } else if (data.balance !== undefined) {
        // Legacy / example shape fallback
        balance   = parseFloat(data.balance);
        currency  = data.currency || 'USD';
        available = parseFloat(data.available ?? data.balance);
      }

      if (balance === null) return null;

      _balanceCache = { ts: Date.now(), balance, currency, available, granted, toppedUp, isAvailable };
      return _balanceCache;

    } catch (_) {
      return null;
    }
  }

  /**
   * initBalanceWidget() — wire up the #footerBalance element.
   * Fetches balance once on load; refreshes on click.
   */
  function initBalanceWidget() {
    const el = document.getElementById('footerBalance');
    if (!el) return;

    const label  = el.querySelector('.balance-label');
    const value  = el.querySelector('.balance-value');
    const btn    = el.querySelector('.balance-refresh');
    if (!label || !value) return;

    async function refresh(showSpinner = false) {
      if (showSpinner) value.textContent = '…';
      const result = await fetchBalance();
      _renderBalance(result, label, value, btn);
    }

    if (btn) btn.addEventListener('click', () => refresh(true));

    // Initial fetch — only when a key exists
    if (hasKey()) refresh(false);

    // Re-check when key is saved / changed (listen for storage events)
    window.addEventListener('storage', e => {
      if (e.key === 'ds_api_key') refresh(false);
    });
  }

  function _renderBalance(result, label, value, btn) {
    const T = (k, fb) => (window.Lang ? Lang.t(k) : null) || fb;

    if (!result) {
      if (!hasKey()) {
        label.textContent = T('balance.label', 'Balance');
        value.textContent = T('balance.noKey', '—');
        value.className   = 'balance-value balance-unknown';
      } else {
        label.textContent = T('balance.label', 'Balance');
        value.textContent = T('balance.error', 'unavailable');
        value.className   = 'balance-value balance-error';
      }
      return;
    }

    if (result.error) {
      label.textContent = T('balance.label', 'Balance');
      const errMap = {
        INVALID_KEY: T('balance.invalidKey', 'invalid key'),
        RATE_LIMIT:  T('balance.rateLimit',  'rate limited'),
      };
      value.textContent = errMap[result.error] || T('balance.error', 'unavailable');
      value.className   = 'balance-value balance-error';
      return;
    }

    const fmt = v => (v !== null && v !== undefined && !isNaN(v))
      ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';

    label.textContent = T('balance.label', 'Balance');
    value.textContent = `${fmt(result.balance)} ${result.currency}`;
    value.className   = (result.balance > 0 && result.isAvailable !== false)
      ? 'balance-value balance-ok'
      : 'balance-value balance-empty';

    // Build tooltip with breakdown
    const tip = [];
    if (result.toppedUp  !== null) tip.push(`Topped-up: ${fmt(result.toppedUp)} ${result.currency}`);
    if (result.granted   !== null) tip.push(`Granted: ${fmt(result.granted)} ${result.currency}`);
    const balEl = value.closest('#footerBalance');
    if (balEl) balEl.title = tip.join(' | ') || '';

    if (btn) btn.title = T('balance.refresh', 'Refresh balance');
  }

  /* ── Public refresh (called after key is saved) ──────────────── */
  function refreshBalance() {
    const el    = document.getElementById('footerBalance');
    if (!el) return;
    const label = el.querySelector('.balance-label');
    const value = el.querySelector('.balance-value');
    const btn   = el.querySelector('.balance-refresh');
    fetchBalance().then(r => _renderBalance(r, label, value, btn));
  }


  /* ── Translation via DeepSeek API ───────────────────────────── */
  const LANG_NAMES = {
    uk: 'Ukrainian',
    es: 'Spanish',
    en: 'English',
    de: 'German',
    fr: 'French',
    pl: 'Polish',
  };

  /**
   * translateText(text, sourceLang, targetLang) → Promise<string>
   *
   * Translates text using DeepSeek chat API.
   * temperature=0.1 for deterministic, faithful output.
   * Returns the translated string, or throws on API error.
   *
   * @param {string} text        - Text to translate
   * @param {string} sourceLang  - BCP-47 code ('uk', 'es', etc.) or full name
   * @param {string} targetLang  - BCP-47 code or full name (default: 'en')
   */
  async function translateText(text, sourceLang = 'uk', targetLang = 'en') {
    if (!hasKey()) throw new Error('NO_API_KEY');

    const srcName = LANG_NAMES[sourceLang] || sourceLang;
    const tgtName = LANG_NAMES[targetLang] || targetLang;

    const resp = await chatRequest({
        model:       MODEL,
        temperature: 0.1,
        max_tokens:  2000,
        messages: [
          {
            role:    'system',
            content: `You are a professional translator. Translate the following ${srcName} text to ${tgtName}. Output ONLY the translation — no explanations, no quotes, no preamble, no original text.`,
          },
          {
            role:    'user',
            content: text,
          },
        ],
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${resp.status}`;
      if (resp.status === 401) throw new Error('INVALID_KEY');
      if (resp.status === 429) throw new Error('RATE_LIMIT');
      if (resp.status === 402) throw new Error('QUOTA_EXCEEDED');
      throw new Error(`DeepSeek translate: ${msg}`);
    }

    const data = await resp.json();
    const translated = data?.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('Empty translation response from DeepSeek');

    console.info(
      `[DeepSeek] translate ${srcName}→${tgtName} | ` +
      `in:${data.usage?.prompt_tokens} out:${data.usage?.completion_tokens}`
    );
    return translated;
  }

  return {
    generatePrompt,
    detectOutputLang,
    translateText,
    fetchKeyFromEnv,
    fetchBalance,
    refreshBalance,
    initBalanceWidget,
    hasKey,
    getActiveEngine,
    friendlyError,
    initApiKeyBanner,
    initEngineTabs,
    openApiKeyModal: appApiKeyModal,
    showApiKeyBtn:   () => _showBtnOpenApiKey(document.getElementById('btnOpenApiKey')),
    hideApiKeyBtn:   () => _hideBtnOpenApiKey(document.getElementById('btnOpenApiKey')),
  };

})();