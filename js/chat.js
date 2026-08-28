document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');
    const resetBtn = document.getElementById('chat-reset-btn');

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
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message';
        loadingDiv.textContent = 'Thinking...';
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
                Hello! I am Efkleidi's AI assistant. How can I help you regarding his experience or the technologies he knows?
            </div>
        `;
    }

    window.sendSuggestedQuestion = function(chipElement) {
        chatInput.value = chipElement.textContent;
        handleSend();
    };
});
