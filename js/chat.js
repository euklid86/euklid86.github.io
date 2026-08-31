document.addEventListener('DOMContentLoaded', () => {
    
    const translations = {
        el: {
            welcome: "Γεια σου! Είμαι ο AI βοηθός του Ευκλείδη. Πώς μπορώ να σε βοηθήσω;",
            thinking: "Σκέφτεται...",
            placeholder: "Γράψε το μήνυμά σου...",
            toggleBtn: "EN",
            systemInstruction: (resumeData) => `
                Είσαι ο ψηφιακός βοηθός (AI Assistant) του Ευκλείδη Μιχαηλίδη.
                Απάντησε στις ερωτήσεις στα ΕΛΛΗΝΙΚΑ χρησιμοποιώντας ΑΠΟΚΛΕΙΣΤΙΚΑ τα παρακάτω δεδομένα:
                ${JSON.stringify(resumeData, null, 2)}
            `
        },
        en: {
            welcome: "Hello! I am Efkleidis's AI assistant. How can I help you today?",
            thinking: "Thinking...",
            placeholder: "Type your message...",
            toggleBtn: "EL",
            systemInstruction: (resumeData) => `
                You are the digital AI Assistant for Efkleidis Michailidis.
                Answer questions in ENGLISH strictly using the following background data:
                ${JSON.stringify(resumeData, null, 2)}
            `
        }
    };

    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('chat-send-btn');
    const messagesContainer = document.getElementById('chat-messages');
    const resetBtn = document.getElementById('chat-reset-btn');

    const langToggleBtn = document.getElementById('lang-toggle-btn');
    const chatInput = document.getElementById('chat-input');
    let currentLang = 'en';
    // 2. Event Listener για εναλλαγή γλώσσας
    langToggleBtn?.addEventListener('click', () => {
        currentLang = currentLang === 'el' ? 'en' : 'el';
        
        // Ενημέρωση κουμπιού & Placeholder
        langToggleBtn.textContent = translations[currentLang].toggleBtn;
        if (chatInput) chatInput.placeholder = translations[currentLang].placeholder;

        // Επανεκκίνηση του chat στη νέα γλώσσα
        resetChat();
        updatePageLanguage(currentLang);
    });

    // Πίνακας διατήρησης ιστορικού για το Gemini API (role: 'user' | 'model')
    let chatHistory = [];

    toggleBtn.addEventListener('click', () => chatBox.classList.toggle('chat-hidden'));
    closeBtn.addEventListener('click', () => chatBox.classList.add('chat-hidden'));

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        // 1. Εμφάνιση μηνύματος χρήστη στο UI
        addMessageToUI(text, 'user-message');
        chatInput.value = '';

        // 2. Προσθήκη μηνύματος χρήστη στο ιστορικό
        chatHistory.push({
            role: 'user',
            parts: [{ text: text }]
        });

        // 3. UI Loading Indicator
        // const loadingDiv = document.createElement('div');
        // loadingDiv.className = 'message assistant-message';
        // loadingDiv.textContent = 'Thinking...';
        // messagesContainer.appendChild(loadingDiv);
        // messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message loading-wrapper';
        
        // Προσθήκη του loader και του κειμένου
        loadingDiv.innerHTML = `
            <div class="gemini-loader"></div>
            <span>${translations[currentLang].thinking}</span>
        `;
        
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // 4. Αποστολή ΟΛΟΥ του ιστορικού στο backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: chatHistory })
            });

            const data = await response.json();
            loadingDiv.remove();

            if (data.reply) {
                // 5. Εμφάνιση απάντησης στο UI
                addMessageToUI(data.reply, 'assistant-message');

                // 6. Προσθήκη απάντησης του AI στο ιστορικό
                chatHistory.push({
                    role: 'model',
                    parts: [{ text: data.reply }]
                });
            } else {
                // addMessageToUI('Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.', 'assistant-message');
                addMessageToUI('Something went wrong. Please try again.', 'assistant-message');
                // Αν απέτυχε, αφαιρούμε το τελευταίο ερώτημα για να μην μολυνθεί το ιστορικό
                chatHistory.pop();
            }
        } catch (error) {
            loadingDiv.remove();
            // addMessageToUI('Σφάλμα σύνδεσης με τον server.', 'assistant-message');
            addMessageToUI('Connection error with the server.', 'assistant-message');
            chatHistory.pop();
        }
    }

    async function addMessageToUI(text, className) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${className}`;
        messagesContainer.appendChild(msgDiv);
    
        if (className === 'assistant-message') {
            // 1. Χωρίζουμε το κείμενο σε παραγράφους
            const paragraphs = text.split(/\n+/);
    
            for (let i = 0; i < paragraphs.length; i++) {
                const trimmedParagraph = paragraphs[i].trim();
                if (trimmedParagraph.length === 0) continue;
    
                const p = document.createElement('p');
                p.style.margin = '0 0 8px 0';
                msgDiv.appendChild(p);
    
                // 2. Χωρίζουμε την παράγραφο σε τμήματα (tokens) με βάση τα ** ή *
                // Παράδειγμα: "Γεια **Ευκλείδη**!" -> ["Γεια ", "**Ευκλείδη**", "!"]
                const tokens = trimmedParagraph.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    
                for (let token of tokens) {
                    if (!token) continue;
    
                    // Ελέγχουμε αν το token είναι περιτυλιγμένο σε ** ή *
                    const isBold = (token.startsWith('**') && token.endsWith('**')) || 
                                   (token.startsWith('*') && token.endsWith('*'));
    
                    // Αφαιρούμε τα σύμβολα Markdown για να πάρουμε το καθαρό κείμενο
                    let cleanText = isBold ? token.replace(/^\*\*|\*\* me|^\*|\*$/g, '').replace(/\*/g, '') : token;
                    if (cleanText.startsWith('*')) {
                        cleanText = cleanText.replace('*', '\n');
                    }
                    cleanText = cleanText.replace(':', '');
                    // Δημιουργούμε το κατάλληλο HTML element (strong ή plain text Node)
                    let targetNode;
                    if (isBold) {
                        targetNode = document.createElement('strong');
                        p.appendChild(targetNode);
                    } else {
                        targetNode = document.createTextNode('');
                        p.appendChild(targetNode);
                    }
    
                    // 3. Εφέ πληκτρολόγησης ανά χαρακτήρα
                    for (let char of cleanText) {
                        targetNode.textContent += char;
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        await new Promise(resolve => setTimeout(resolve, 15));
                    }
                }
            }
    
            // Αφαίρεση του κάτω περιθωρίου από την τελευταία παράγραφο
            if (msgDiv.lastElementChild) {
                msgDiv.lastElementChild.style.marginBottom = '0';
            }
        } else {
            // Τα μηνύματα του χρήστη εμφανίζονται αμέσως
            msgDiv.textContent = text;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    resetBtn.addEventListener('click', resetChat);

    function resetChat() {
        // 1. Μηδενισμός του πίνακα ιστορικού
        chatHistory = [];

        // 2. Επαναφορά του UI στο αρχικό μήνυμα καλωσορίσματος
        messagesContainer.innerHTML = `
            <div class="message-first assistant-message">
                ${translations[currentLang].welcome}
            </div>
        `;
    }

    function updatePageLanguage(lang) {
        currentLang = lang;
    
        // Αλλαγή κειμένου σε όλα τα elements με data-el / data-en
        document.querySelectorAll('[data-el][data-en]').forEach(el => {
            el.textContent = el.getAttribute(`data-${lang}`);
        });
    
        // Αλλαγή σε Placeholders (π.χ. στο Chat Input)
        document.querySelectorAll('[data-placeholder-el][data-placeholder-en]').forEach(el => {
            el.placeholder = el.getAttribute(`data-placeholder-${lang}`);
        });
    
        // Ενημέρωση του κειμένου στο κουμπί toggle
        const toggleBtn = document.getElementById('lang-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = lang === 'el' ? 'EL' : 'EN';
        }
    
        // Επανεκκίνηση του Chatbot με τη νέα γλώσσα
        resetChat();
    }

    window.sendSuggestedQuestion = function(chipElement) {
        chatInput.value = chipElement.textContent;
        handleSend();
    };

    // window.addEventListener('DOMContentLoaded', () => {
    //     const urlParams = new URLSearchParams(window.location.search);
    //     if (urlParams.get('openChat') === 'true') {
    //         // Κώδικας που ανοίγει αυτόματα το chat window
    //         const chatBox = document.getElementById('chat-box');
    //         if (chatBox) {
    //             chatBox.classList.remove('chat-hidden');
    //         }
    //     }
    // });

    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Χειρισμός Shortcut για Email
        if (urlParams.get('action') === 'email') {
            // Καθαρίζουμε το URL για να μην ξανα-ενεργοποιηθεί σε refresh
            window.history.replaceState({}, document.title, window.location.pathname);
    
            // 1. Σκρολάρουμε ομαλά στην ενότητα επικοινωνίας
            const contactSection = document.querySelector('.contact-info');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
    
            // 2. Δημιουργούμε ένα προσωρινό κουμπί/σύνδεσμο και το πατάμε προγραμματιστικά 
            // ή ανοίγουμε το mailto με ένα μικρό timeout
            setTimeout(() => {
                const mailLink = document.createElement('a');
                mailLink.href = 'mailto:euklid86@gmail.com';
                mailLink.rel = 'noopener noreferrer';
                document.body.appendChild(mailLink);
                mailLink.click();
                document.body.removeChild(mailLink);
            }, 300);
        }
        
        // 2. Χειρισμός Shortcut για AI Chat
        if (urlParams.get('openChat') === 'true') {
            const chatBox = document.getElementById('chat-box');
            if (chatBox) {
                chatBox.classList.remove('chat-hidden');
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }
            // Καθαρισμός URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    });
});
