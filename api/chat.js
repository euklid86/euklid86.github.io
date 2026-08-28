import resumeData from 'resume.json' with { type: 'json' };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Λαμβάνουμε ολόκληρο το ιστορικό από το Frontend
    const { history } = req.body;

    if (!history || !Array.isArray(history) || history.length === 0) {
        return res.status(400).json({ error: 'History payload is missing or empty' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API Key is missing' });
    }

    const formattedResume = JSON.stringify(resumeData, null, 2);

    const SYSTEM_PROMPT = `
    Είσαι ο ψηφιακός βοηθός (AI Assistant) του Ευκλείδη Μιχαηλίδη.
    Ο ρόλος σου είναι να απαντάς σε ερωτήσεις επισκεπτών σχετικά με την επαγγελματική εμπειρία, τις τεχνικές δεξιότητες, την εκπαίδευση και την πορεία του Ευκλείδη.

    Χρησιμοποίησε ΑΠΟΚΛΕΙΣΤΙΚΑ τα παρακάτω δεδομένα βιογραφικού:
    ---
    ${formattedResume}
    ---

    Κανόνες:
    1. Απάντησε στη γλώσσα της ερώτησης.
    2. Να είσαι επαγγελματικός, φιλικός και σύντομος.
    3. Αν ρωτηθεί κάτι εκτός βιογραφικού, πρότεινε επικοινωνία στο ${resumeData.personal_info.email}.
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                // Στέλνουμε όλο το ιστορικό διαμορφωμένο όπως το περιμένει το Gemini API
                contents: history
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch from Gemini');
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Λυπάμαι, δεν μπόρεσα να επεξεργαστώ την απάντηση.";

        return res.status(200).json({ reply });

    } catch (error) {
        console.error('Error in API:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
