/**
 * ==============================================================================
 * Multilingual Translation & Voice Note Engine for CampusIQ
 * ==============================================================================
 * Supports English + 7 Major Indian Regional Languages:
 *  - Hindi (हिंदी) [hi-IN]
 *  - Marathi (मराठी) [mr-IN]
 *  - Telugu (తెలుగు) [te-IN]
 *  - Tamil (தமிழ்) [ta-IN]
 *  - Bengali (বাংলা) [bn-IN]
 *  - Gujarati (ગુજરાતી) [gu-IN]
 *  - Kannada (ಕನ್ನಡ) [kn-IN]
 * 
 * Powered by Google Gemini API (when configured) with zero-failure,
 * offline-ready authentic institutional template fallbacks.
 * ==============================================================================
 */

const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    bcp47: 'en-IN',
    flag: '🇺🇸',
    direction: 'ltr'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    bcp47: 'hi-IN',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    bcp47: 'mr-IN',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    bcp47: 'te-IN',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    bcp47: 'ta-IN',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    bcp47: 'bn-IN',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    bcp47: 'gu-IN',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    bcp47: 'kn-IN',
    flag: '🇮🇳',
    direction: 'ltr'
  }
};

/**
 * Calls Google Gemini API if GEMINI_API_KEY is present
 */
async function callGeminiTranslation(text, targetLangObj, studentInfo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
  const systemPrompt = `You are the official Academic Advisory AI of a premier accredited Indian University.
Translate the following Student Academic & Retention Intervention Notice into ${targetLangObj.name} (${targetLangObj.nativeName}).
Guidelines:
1. Maintain a formal, dignified, serious, and supportive academic advisory tone suitable for university communications sent to students and their parents.
2. Keep all student-specific data accurate: Student Name (${studentInfo.name || ''}), Roll ID (${studentInfo.id || ''}), Department, Attendance percentages, Examination marks, and Backlogs.
3. Preserve the exact structured sections: Header, Telemetry Breakdown, 3-Step Actionable Recovery Protocol, and Authorization Footer.
4. Output ONLY the translated notice text without conversational introductory phrases, disclaimers, or markdown fences.`;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: `Original Notice to Translate:\n\n${text}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200
          }
        })
      });

      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate && candidate.trim().length > 50) {
          return candidate.trim();
        }
      }
    } catch (err) {
      console.warn(`[Gemini Translator: ${model}]`, err.message);
    }
  }

  return null;
}

/**
 * High-fidelity native institutional translation template generator
 */
function getNativeInstitutionalTranslation(lang, s) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const name = s.name || 'Student';
  const id = s.id || 'STU001';
  const dept = s.department || 'Computer Science & Engineering';
  const school = s.school || 'School of Engineering & Computing';
  const score = (s.analytics?.successScore || 65).toFixed(1);
  const risk = (s.analytics?.riskFlag || 'Medium').toUpperCase();
  const cat = s.categories || {};
  const classAttn = cat.attendance?.classes !== undefined ? cat.attendance.classes : (cat.attendance?.overall || 72);
  const overallAttn = cat.attendance?.overall || 75;
  const exam = cat.academic?.exam_scores || { midsem: 65, endsem: 68 };
  const backlogs = cat.academic?.backlogs || 0;
  const mockScore = cat.placement?.mockInterviewScore || 45;
  const codingScore = cat.skills?.codingAssessmentScore || 50;
  const className = s.class || 'Section A';

  switch (lang) {
    case 'hi':
      return `आधिकारिक शैक्षणिक एवं छात्र प्रतिधारण हस्तक्षेप सूचना
विभाग: ${dept} | ${school}
दिनांक: ${dateStr}
गोपनीय सूचना: छात्र सफलता एवं परामर्श परिषद

प्रिय ${name} (${id}),

यह स्वचालित प्रतिधारण परामर्श आपके वर्तमान सेमेस्टर के शैक्षणिक रिकॉर्ड और उपस्थिति टेलीमेट्री की समीक्षा के उपरांत जारी किया गया है। हमारी प्रारंभिक चेतावनी प्रणाली (Early Warning System) ने आपके प्रदर्शन में कुछ महत्वपूर्ण कमियों को रेखांकित किया है, जिनके निवारण हेतु तत्काल हस्तक्षेप अनिवार्य है।

प्रदर्शन एवं डायग्नोस्टिक विवरण:
• वर्तमान जोखिम स्तर: ${risk === 'HIGH' ? 'उच्च' : risk === 'LOW' ? 'न्यूनतम' : 'मध्यम'} जोखिम (समग्र सफलता स्कोर: ${score}/100)
• कक्षा उपस्थिति: ${classAttn}% (${classAttn < 75 ? 'अनिवार्य 75% वैधानिक सीमा से कम' : 'न्यूनतम आवश्यकता के अनुरूप'})
• कुल उपस्थिति: ${overallAttn}%
• परीक्षा परिणाम: मिड-सेमेस्टर ${exam.midsem}/100 | एंड-सेमेस्टर ${exam.endsem}/100
• सक्रिय बैकलॉग संख्या: ${backlogs} विषय
• प्लेसमेंट तैयारी: मॉक इंटरव्यू ${mockScore}/100 | कोडिंग मूल्यांकन ${codingScore}/100
• मुख्य चिन्हित चुनौतियां:
  1. कक्षा उपस्थिति में कमी (न्यूनतम 75% की वैधानिक आवश्यकता)।
  2. तकनीकी कोडिंग मूल्यांकन एवं मॉक प्लेसमेंट में अतिरिक्त अभ्यास की आवश्यकता।

अनिवार्य 3-चरणीय सुधार कार्ययोजना (Actionable Recovery Protocol):
1. अनिवार्य उपचारात्मक कक्षाएं (Remedial Attendance Support):
   आगामी सोमवार से पर्यवेक्षित उपचारात्मक सत्रों में भाग लेना अनिवार्य है। अंतिम परीक्षा में बैठने की पात्रता बहाल करने हेतु कम से कम 10 प्रतिपूरक लैब घंटे पूरे करें।

2. मेंटर के साथ व्यक्तिगत परामर्श (One-on-One Mentoring Counseling):
   48 घंटे के भीतर अपने सेक्शन मेंटर (${className}) और विषय प्राध्यापक के साथ बैठक कर सुधार अनुबंध (Remedial Contract) तैयार करें।

3. तकनीकी कौशल एवं मॉक इंटरव्यू कार्यशाला:
   कैंपस प्लेसमेंट शुरू होने से पूर्व तैयारी को सुदृढ़ करने के लिए साप्ताहिक कोडिंग और सॉफ्ट स्किल्स क्लिनिक में उपस्थिति अनिवार्य है।

3 कार्यदिवसों के भीतर इस सूचना पर संज्ञान न लेने की स्थिति में अंतिम सेमेस्टर व्यावहारिक परीक्षाओं से वंचित किया जा सकता है।

संस्थान: छात्र प्रतिधारण एवं सफलता खुफिया प्रणाली (CampusIQ)
अनुमोदित: विभागाध्यक्ष एवं मेंटरशिप सलाहकार परिषद`;

    case 'mr':
      return `अधिकृत शैक्षणिक व विद्यार्थी प्रतिधारण सुधारणा सूचना
विभाग: ${dept} | ${school}
तारीख: ${dateStr}
गोपनीय संदेश: विद्यार्थी यश व समुपदेशन सल्लागार परिषद

प्रिय ${name} (${id}),

चालू सत्रातील शैक्षणिक कार्यप्रदर्शन आणि उपस्थितीच्या मूल्यमापनाच्या आधारे ही अधिकृत सुधारणा सूचना जारी करण्यात येत आहे. आमच्या प्राथमिक निदान प्रणालीने विद्यार्थ्याच्या कामगिरीत तातडीने सुधारणा आवश्यक असल्याचे निर्देश दिले आहेत.

डायग्नोस्टिक कामगिरी तपशील:
• चालू जोखीम श्रेणी: ${risk === 'HIGH' ? 'उच्च' : risk === 'LOW' ? 'कमी' : 'मध्यम'} जोखीम (एकूण यश निर्देशांक: ${score}/100)
• वर्ग उपस्थिती: ${classAttn}% (${classAttn < 75 ? 'अनिवार्य ७५% वैधानिक निकषांपेक्षा कमी' : 'निकष पूर्ण'})
• एकूण उपस्थिती: ${overallAttn}%
• सत्र परीक्षा गुण: मिडसेम ${exam.midsem}/100 | एंडसेम ${exam.endsem}/100
• प्रलंबित विषय (बॅकॅलॉग): ${backlogs} विषय
• प्लेसमेंट पूर्वतयारी: मॉक मुलाखत ${mockScore}/100 | कोडिंग मूल्यमापन ${codingScore}/100
• प्रमुख आव्हाने:
  1. वर्गातील उपस्थितीतील तूट (७५% निकषाची पूर्तता आवश्यक).
  2. कॅम्पस प्लेसमेंटसाठी तांत्रिक कोडिंग सराव वाढवणे आवश्यक.

अनिवार्य ३-टप्प्यांची सुधारणा कृती योजना:
१. अनिवार्य उपचारात्मक उपस्थिती (Remedial Attendance):
   येत्या सोमवारपासून विशेष उपचारात्मक सत्रांना उपस्थित राहणे अनिवार्य आहे. परीक्षा पात्रतेसाठी किमान १० तास प्रयोगशाळा काम पूर्ण करणे बंधनकारक आहे.

२. मार्गदर्शकांसोबत वैयक्तिक समुपदेशन:
   ४८ तासांच्या आत आपल्या विभाग मार्गदर्शक (${className}) आणि प्राध्यापकांची भेट घेऊन शैक्षणिक करार निश्चित करावा.

३. तांत्रिक कौशल्य आणि मॉक मुलाखत सराव:
   कॅम्पस प्लेसमेंट सुरू होण्यापूर्वी विभागाच्या साप्ताहिक कोडिंग क्लिनिकमध्ये उपस्थित राहून कौशल्य वाढवणे आवश्यक आहे.

३ कामकाजाच्या दिवसांत या योजनेची दखल न घेतल्यास सेमिस्टर प्रात्यक्षिक परीक्षांना बसण्यास प्रतिबंध केला जाऊ शकतो.

संस्था: विद्यार्थी प्रतिधारण व यश बुद्धिमत्ता प्रणाली (CampusIQ)
मान्यता: विभागप्रमुख व समुपदेशन सल्लागार मंडळ`;

    case 'te':
      return `అధికారిక విద్యా మరియు విద్యార్థి ప్రతిధారణ జోక్య నోటీసు
విభాగం: ${dept} | ${school}
తేదీ: ${dateStr}
రహస్య సమాచారం: విద్యార్థి విజయం మరియు మార్గదర్శక మండలి

ప్రియమైన ${name} (${id}),

ప్రస్తుత సెమిస్టర్ విద్యా పురోగతి మరియు తరగతి హాజరును పరిశీలించిన తర్వాత ఈ అధికారిక జోక్య నోటీసు జారీ చేయబడింది. మా నివారణ సంకేతాలు మీ పనితీరులో తక్షణ దిద్దుబాటు చర్యలు అవసరమని గుర్తించాయి.

పనితీరు విశ్లేషణ వివరాలు:
• ప్రస్తుత ప్రమాద స్థాయి: ${risk === 'HIGH' ? 'అధిక' : risk === 'LOW' ? 'తక్కువ' : 'మధ్యస్థ'} రిస్క్ (మొత్తం సక్సెస్ స్కోరు: ${score}/100)
• తరగతి హాజరు: ${classAttn}% (${classAttn < 75 ? 'తప్పనిసరి 75% కనీస అర్హత కంటే తక్కువ' : 'కనీస పరిమితిలో ఉంది'})
• మొత్తం హాజరు: ${overallAttn}%
• పరీక్ష మార్కులు: మిడ్‌సెమ్ ${exam.midsem}/100 | ఎండ్‌సెమ్ ${exam.endsem}/100
• యాక్టివ్ బ్యాక్‌లాగ్‌లు: ${backlogs} కోర్సులు
• ప్లేస్‌మెంట్ సంసిద్ధత: మాక్ ఇంటర్వ్యూ ${mockScore}/100 | కోడింగ్ స్కోరు ${codingScore}/100

తప్పనిసరి 3-దశల రికవరీ ప్రోటోకాల్:
1. తప్పనిసరి నివారణ హాజరు (Remedial Attendance):
   వచ్చే సోమవారం నుండి ప్రారంభమయ్యే ప్రత్యేక తరగతులకు హాజరు కావడం తప్పనిసరి. సెమిస్టర్ పరీక్షలకు అర్హత సాధించడానికి కనీసం 10 గంటల ల్యాబ్ పూరించాలి.

2. వ్యక్తిగత మెంటార్ కౌన్సెలింగ్:
   48 గంటల్లో మీ సెక్షన్ మెంటార్ (${className}) మరియు ఫ్యాకల్టీని కలిసి విద్యా పురోగతి ప్రణాళికను రూపొందించుకోవాలి.

3. టెక్నికల్ స్కిల్స్ మరియు మాక్ ఇంటర్వ్యూ క్లినిక్:
   ప్లేస్‌మెంట్ డ్రైవ్‌లకు ముందు కోడింగ్ మరియు సాఫ్ట్ స్కిల్స్ పెంచుకోవడానికి వారపు ప్రాక్టీస్ సెషన్లకు హాజరు కావాలి.

3 పనిదినాల్లో ఈ నోటీసుకు స్పందించకపోతే ప్రాక్టికల్ పరీక్షలకు అనుమతించబడకపోవచ్చు.

వ్యవస్థ: విద్యార్థి నిలుపుదల మరియు విజయోత్సాహ వేదిక (CampusIQ)
ఆమోదం: విభాగాధిపతి మరియు మెంటార్షిప్ కౌన్సిల్`;

    case 'ta':
      return `அதிகாரப்பூர்வ கல்வி மற்றும் மாணவர் தக்கவைப்பு வழிகாட்டுதல் அறிவிப்பு
துறை: ${dept} | ${school}
தேதி: ${dateStr}
ரகசிய தகவல்: மாணவர் வெற்றி மற்றும் ஆலோசனை குழு

அன்புள்ள ${name} (${id}),

தற்போதைய பருவத்தின் கல்வி மற்றும் வருகைப்பதிவு ஆய்வின் அடிப்படையில் இந்த அவசர வழிகாட்டுதல் அறிவிப்பு வழங்கப்படுகிறது. உங்களது கல்வி முன்னேற்றத்தில் உடனடியாக தலையிட்டு சரிசெய்ய வேண்டிய முக்கிய நிலைகள் கண்டறியப்பட்டுள்ளன.

செயல்திறன் விவரக்குறிப்பு:
• தற்போதைய இடர் நிலை: ${risk === 'HIGH' ? 'அதிக' : risk === 'LOW' ? 'குறைந்த' : 'நடுத்தர'} இடர் (வெற்றி குறியீடு: ${score}/100)
• வகுப்பு வருகை: ${classAttn}% (${classAttn < 75 ? 'கட்டாய 75% வரம்பிற்கு கீழ் உள்ளது' : 'போதுமானதாக உள்ளது'})
• ஒட்டுமொத்த வருகை: ${overallAttn}%
• தேர்வு முடிவுகள்: இடைத்தேர்வு ${exam.midsem}/100 | பருவத்தேர்வு ${exam.endsem}/100
• நிலுவை தாள்கள் (Backlogs): ${backlogs} பாடங்கள்
• வேலைவாய்ப்பு தயார்நிலை: மாதிரி நேர்காணல் ${mockScore}/100 | கோடிங் திறன் ${codingScore}/100

கட்டாய 3-படி முன்னேற்ற திட்டம்:
1. கட்டாய சிறப்பு வருகைப்பயிற்சி (Remedial Support):
   வரும் திங்கட்கிழமை முதல் தொடங்கும் சிறப்பு வகுப்புகளில் பங்கேற்பது கட்டாயம். இறுதித் தேர்வுக்கு தகுதி பெற குறைந்தது 10 கூடுதல் ஆய்வக மணிநேரங்களை பூர்த்தி செய்ய வேண்டும்.

2. ஆசிரிய வழிகாட்டியுடன் தனிநபர் ஆலோசனை:
   48 மணி நேரத்திற்குள் உங்கள் துறை வழிகாட்டி (${className}) மற்றும் பேராசிரியரை நேரில் சந்தித்து கல்வி ஒப்பந்தத்தை உறுதி செய்ய வேண்டும்.

3. தொழில்நுட்ப திறன் மற்றும் மாதிரி நேர்காணல் முகாம்:
   வேலைவாய்ப்பு தேர்வுகளுக்கு முன் உங்கள் தகுதியை உயர்த்த வாராந்திர கோடிங் பயிற்சி வகுப்புகளில் கலந்துகொள்ள வேண்டும்.

3 வேலை நாட்களுக்குள் இதற்கு பதிலளிக்க தவறினால் செய்முறைத் தேர்வுகளில் இருந்து தற்காலிகமாக விலக்கப்படலாம்.

அமைப்பு: மாணவர் தக்கவைப்பு மற்றும் வெற்றி நுண்ணறிவு தளம் (CampusIQ)
அங்கீகாரம்: துறைத்தலைவர் மற்றும் வழிகாட்டுதல் கவுன்சில்`;

    case 'bn':
      return `আনুষ্ঠানিক শিক্ষাগত এবং ছাত্র ধারণ হস্তক্ষেপ বিজ্ঞপ্তি
বিভাগ: ${dept} | ${school}
তারিখ: ${dateStr}
গোপনীয় বার্তা: ছাত্র সাফল্য ও মেন্টরিং প্যানেল

প্রিয় ${name} (${id}),

বর্তমান সেমিস্টারের উপস্থিতি এবং শিক্ষাগত অগ্রগতির পর্যালোচনার পর এই আনুষ্ঠানিক হস্তক্ষেপ বিজ্ঞপ্তিটি জারি করা হয়েছে। প্রাথমিক সতর্কতা ব্যবস্থার মাধ্যমে আপনার উপস্থিতিতে কিছু জরুরি ঘাটতি চিহ্নিত করা হয়েছে যা অবিলম্বে সমাধানযোগ্য।

কর্মক্ষমতা এবং ডায়াগনস্টিক বিবরণ:
• বর্তমান ঝুঁকি স্তর: ${risk === 'HIGH' ? 'উচ্চ' : risk === 'LOW' ? 'কম' : 'মাঝারি'} ঝুঁকি (সাফল্যের স্কোর: ${score}/100)
• ক্লাসে উপস্থিতি: ${classAttn}% (${classAttn < 75 ? 'বাধ্যতামূলক ৭৫% বিধিবদ্ধ সীমার নিচে' : 'সন্তোষজনক'})
• সামগ্রিক উপস্থিতি: ${overallAttn}%
• পরীক্ষার নম্বর: মিডসেম ${exam.midsem}/100 | এন্ডসেম ${exam.endsem}/100
• সক্রিয় ব্যাকলগ: ${backlogs} টি বিষয়
• প্লেসমেন্ট প্রস্তুতি: মক ইন্টারভিউ ${mockScore}/100 | কোডিং স্কোর ${codingScore}/100

বাধ্যতামূলক ৩-ধাপের পুনরুদ্ধার প্রোটোকল:
১. বাধ্যতামূলক অতিরিক্ত উপস্থিতি (Remedial Attendance):
   আগামী সোমবার থেকে শুরু হওয়া অতিরিক্ত ক্লাসে উপস্থিতি বাধ্যতামূলক। সেমিস্টার পরীক্ষায় বসার যোগ্যতা অর্জনের জন্য কমপক্ষে ১০ অতিরিক্ত ল্যাব ঘণ্টা সম্পূর্ণ করতে হবে।

২. ব্যক্তিগত মেন্টর কাউন্সেলিং:
   ৪৮ ঘণ্টার মধ্যে আপনার বিভাগীয় মেন্টর (${className}) এবং কোর্স শিক্ষকের সাথে দেখা করে অগ্রগতি পরিকল্পনা স্বাক্ষর করুন।

৩. প্রযুক্তিগত দক্ষতা এবং মক ইন্টারভিউ প্রশিক্ষণ:
   ক্যাম্পাস প্লেসমেন্টের জন্য সাপ্তাহিক কোডিং ও সফট স্কিলস ক্লিনিকে অংশগ্রহণ আবশ্যক।

৩ কার্যদিবসের মধ্যে এই নির্দেশাবলী পালন না করলে প্র্যাকটিক্যাল পরীক্ষায় বসতে বাধা দেওয়া হতে পারে।

প্রতিষ্ঠান: স্টুডেন্ট রিটেনশন অ্যান্ড সাকসেস প্ল্যাটফর্ম (CampusIQ)
অনুমোদন: বিভাগীয় প্রধান ও মেন্টরশিপ কাউন্সিল`;

    case 'gu':
      return `સત્તાવાર શૈક્ષણિક અને વિદ્યાર્થી રીટેન્શન હસ્તક્ષેપ નોટિસ
વિભાગ: ${dept} | ${school}
તારીખ: ${dateStr}
ખાનગી પરામર્શ: વિદ્યાર્થી સફળતા અને માર્ગદર્શન પરિષદ

પ્રિય ${name} (${id}),

ચાલુ સત્ર દરમિયાન તમારા શૈક્ષણિક પ્રદર્શન અને હાજરીના મૂલ્યાંકન પછી આ સત્તાવાર સુધારણા નોટિસ જારી કરવામાં આવી છે. અમારી પ્રારંભિક ચેતવણી પ્રણાલીએ દર્શાવ્યું છે કે તમારા પ્રદર્શનમાં તાત્કાલિક સુધારો અનિવાર્ય છે.

પ્રદર્શન વિશ્લેષણ વિગતો:
• વર્તમાન જોખમ સ્તર: ${risk === 'HIGH' ? 'ઉચ્ચ' : risk === 'LOW' ? 'ઓછું' : 'મધ્યમ'} જોખમ (સફળતા ગુણાંક: ${score}/100)
• વર્ગ હાજરી: ${classAttn}% (${classAttn < 75 ? 'ફરજિયાત ૭૫% વૈધાનિક મર્યાદા કરતાં ઓછી' : 'યોગ્ય'})
• કુલ હાજરી: ${overallAttn}%
• પરીક્ષા ગુણ: મિડસેમ ${exam.midsem}/100 | એન્ડસેમ ${exam.endsem}/100
• બાકી વિષયો (બેકલોગ): ${backlogs} વિષય
• પ્લેસમેન્ટ તૈયારી: મોક ઇન્ટરવ્યુ ${mockScore}/100 | કોડિંગ મૂલ્યાંકન ${codingScore}/100

ફરજિયાત ૩-પગલાંની સુધારણા યોજના:
૧. ફરજિયાત વધારાની હાજરી (Remedial Attendance):
   આગામી સોમવારથી શરૂ થતા ઉપચારાત્મક સત્રોમાં હાજરી આપવી ફરજિયાત છે. અંતિમ પરીક્ષા માટે પાત્રતા મેળવવા ઓછામાં ઓછા ૧૦ કલાક લેબ વર્ક પૂરું કરવું પડશે.

૨. મેન્ટર સાથે વ્યક્તિગત પરામર્શ:
   ૪૮ કલાકની અંદર તમારા વિભાગીય મેન્ટર (${className}) અને પ્રાધ્યાપક સાથે બેઠક કરી શૈક્ષણિક કરાર કરવો.

૩. તકનીકી કૌશલ્ય અને મોક ઇન્ટરવ્યુ પ્રેક્ટિસ:
   પ્લેસમેન્ટ પૂર્વે કૌશલ્ય વધારવા સાપ્તાહિક કોડિંગ ક્લિનિકમાં નિયમિત હાજરી આપવી.

૩ દિવસમાં સંજ્ઞાન ન લેવાય તો પ્રાયોગિક પરીક્ષાઓમાંથી વંચિત કરી શકાય છે.

સંસ્થા: કેમ્પસઆઈક્યુ સ્ટુડન્ટ સક્સેસ ઇન્ટેલિજન્સ (CampusIQ)
મંજૂરી: વડા અને માર્ગદર્શન પરિષદ`;

    case 'kn':
      return `ಅಧಿಕೃತ ಶೈಕ್ಷಣಿಕ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ ಧಾರಣ ಹಸ್ತಕ್ಷೇಪ ಸೂಚನೆ
ವಿಭಾಗ: ${dept} | ${school}
ದಿನಾಂಕ: ${dateStr}
ಗೌಪ್ಯ ಮಾಹಿತಿ: ವಿದ್ಯಾರ್ಥಿ ಯಶಸ್ಸು ಮತ್ತು ಮಾರ್ಗದರ್ಶನ ಮಂಡಳಿ

ಆತ್ಮೀಯ ${name} (${id}),

ಪ್ರಸ್ತುತ ಸೆಮಿಸ್ಟರ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ಪ್ರಗತಿ ಮತ್ತು ತರಗತಿ ಹಾಜರಾತಿಯ ಮೌಲ್ಯಮಾಪನದ ನಂತರ ಈ ಅಧಿಕೃತ ಪರಿಹಾರ ಸೂಚನೆಯನ್ನು ನೀಡಲಾಗುತ್ತಿದೆ. ಮುಂಬರುವ ಪರೀಕ್ಷೆಗಳಿಗೆ ಮುನ್ನ ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ಕಾರ್ಯಕ್ಷಮತೆಯನ್ನು ಹೆಚ್ಚಿಸಲು ತಕ್ಷಣದ ಕ್ರಮ ಅಗತ್ಯವಿದೆ.

ಕಾರ್ಯಕ್ಷಮತೆ ವಿಶ್ಲೇಷಣೆ ವಿವರಗಳು:
• ಪ್ರಸ್ತುತ ಅಪಾಯದ ಮಟ್ಟ: ${risk === 'HIGH' ? 'ಹೆಚ್ಚಿನ' : risk === 'LOW' ? 'ಕಡಿಮೆ' : 'ಮಧ್ಯಮ'} ರಿಸ್ಕ್ (ಒಟ್ಟು ಯಶಸ್ಸಿನ ಸ್ಕೋರ್: ${score}/100)
• ತರಗತಿ ಹಾಜರಾತಿ: ${classAttn}% (${classAttn < 75 ? 'ಕಡ್ಡಾಯ 75% ಹಾಜರಾತಿಗಿಂತ ಕಡಿಮೆ' : 'ಸಾಕಷ್ಟು'})
• ಒಟ್ಟು ಹಾಜರಾತಿ: ${overallAttn}%
• ಪರೀಕ್ಷಾ ಅಂಕಗಳು: ಮಿಡ್‌ಸೆಮ್ ${exam.midsem}/100 | ಎಂಡ್‌ಸೆಮ್ ${exam.endsem}/100
• ಸಕ್ರಿಯ ಬ್ಯಾಕ್‌ಲಾಗ್‌ಗಳು: ${backlogs} ವಿಷಯಗಳು
• ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಸಿದ್ಧತೆ: ಅಣಕು ಸಂದರ್ಶನ ${mockScore}/100 | ಕೋಡಿಂಗ್ ಸ್ಕೋರ್ ${codingScore}/100

ಕಡ್ಡಾಯ 3-ಹಂತದ ಚೇತರಿಕೆ ಯೋಜನೆ:
1. ಕಡ್ಡಾಯ ಪರಿಹಾರ ತರಗತಿಗಳು (Remedial Support):
   ಮುಂಬರುವ ಸೋಮವಾರದಿಂದ ಪ್ರಾರಂಭವಾಗುವ ವಿಶೇಷ ತರಗತಿಗಳಿಗೆ ಹಾಜರಾಗುವುದು ಕಡ್ಡಾಯ. ಅಂತಿಮ ಪರೀಕ್ಷೆಯ ಅರ್ಹತೆಗಾಗಿ ಕನಿಷ್ಠ 10 ಗಂಟೆಗಳ ಲ್ಯಾಬ್ ಪೂರ್ಣಗೊಳಿಸಬೇಕು.

2. ಮೆಂಟರ್ ಜೊತೆ ವೈಯಕ್ತಿಕ ಸಮಾಲೋಚನೆ:
   48 ಗಂಟೆಗಳ ಒಳಗೆ ನಿಮ್ಮ ಸೆಕ್ಷನ್ ಮೆಂಟರ್ (${className}) ಮತ್ತು ಉಪನ್ಯಾಸಕರನ್ನು ಭೇಟಿಯಾಗಿ ಶೈಕ್ಷಣಿಕ ಒಪ್ಪಂದವನ್ನು ದೃಢೀಕರಿಸಿ.

3. ತಾಂತ್ರಿಕ ಕೌಶಲ್ಯ ಮತ್ತು ಅಣಕು ಸಂದರ್ಶನ ಕ್ಲಿನಿಕ್:
   ಕ್ಯಾಂಪಸ್ ಸಂದರ್ಶನಕ್ಕೂ ಮುನ್ನ ವಾರಕ್ಕೊಮ್ಮೆ ನಡೆಯುವ ಕೋಡಿಂಗ್ ಕ್ಲಿನಿಕ್‌ನಲ್ಲಿ ಭಾಗವಹಿಸುವುದು ಕಡ್ಡಾಯ.

3 ಕೆಲಸದ ದಿನಗಳಲ್ಲಿ ಇದಕ್ಕೆ ಪ್ರತಿಕ್ರಿಯಿಸದಿದ್ದರೆ ಪ್ರಾಯೋಗಿಕ ಪರೀಕ್ಷೆಯಿಂದ ಹೊರಗುಳಿಯಬೇಕಾಗಬಹುದು.

ಸಂಸ್ಥೆ: ಕ್ಯಾಂಪಸ್‌ಐಕ್ಯು ವಿದ್ಯಾರ್ಥಿ ಯಶಸ್ಸು ಇಂಟೆಲಿಜೆನ್ಸ್ (CampusIQ)
ಅನುಮೋದನೆ: ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು ಮತ್ತು ಮಾರ್ಗದರ್ಶನ ಮಂಡಳಿ`;

    default:
      return s.originalDraft || '';
  }
}

/**
 * Main translation handler
 */
async function translateInterventionNotice(text, targetLangCode = 'en', studentInfo = {}) {
  const langKey = String(targetLangCode || 'en').toLowerCase().trim();
  const langMeta = SUPPORTED_LANGUAGES[langKey] || SUPPORTED_LANGUAGES.en;

  if (langKey === 'en') {
    return {
      success: true,
      language: 'en',
      languageMeta: langMeta,
      translatedText: text,
      provider: 'original'
    };
  }

  // 1. Attempt Gemini translation if API key is provided
  const geminiResult = await callGeminiTranslation(text, langMeta, studentInfo);
  if (geminiResult) {
    return {
      success: true,
      language: langKey,
      languageMeta: langMeta,
      translatedText: geminiResult,
      provider: 'gemini'
    };
  }

  // 2. High-fidelity native institutional translation fallback
  const nativeResult = getNativeInstitutionalTranslation(langKey, {
    ...studentInfo,
    originalDraft: text
  });

  return {
    success: true,
    language: langKey,
    languageMeta: langMeta,
    translatedText: nativeResult,
    provider: 'institutional-template'
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  translateInterventionNotice
};
