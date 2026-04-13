

const { useState, useEffect, useRef } = React;

function parseQuizData(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const questions = [];
    let currentQ = null;
    let currentMode = 'context';
    let currentContext = "";
    let isBuildingContext = false;

    lines.forEach(line => {
        line = line.replace(/^[\u2022\u00b7\-\*]\s*/, '').trim();
        if (!line) return;

        const isSection = line.match(/^(?:PHẦN|Phần)\s+[I|V|X|\d]+/i);
        if (isSection) {
            currentContext = "";
            isBuildingContext = false;
        }

        const isCaseStart = line.match(/^(?:TÌNH HUỐNG LÂM SÀNG|Case lâm sàng|Tình huống|Case\s*\d+)/i);
        const isQ = line.match(/^(?:Câu|Question)[^\d]*([\d\.]+)(?:[^a-z0-9]*[:\.\-])?\s*(.*)/i);
        const isOpt = line.match(/^([A-E])[\.\)\:\-\/]\s*(.*)/i);
        const isAns = line.match(/^(?:Đáp án(?: đúng)?|Answer)\s*[:\.\-]?\s*([A-E])/i);

        if (isCaseStart && !isQ) {
            currentContext = line + '\n';
            isBuildingContext = true;
            currentMode = 'context';
            return;
        }

        if (isQ && !isAns) {
            isBuildingContext = false;
            if (currentQ) questions.push(currentQ);
            
            currentQ = { 
                id: questions.length + 1, 
                originalId: isQ[1], 
                context: currentContext.trim(), 
                question: isQ[2] || '', 
                options: {}, 
                answer: '' 
            };
            currentMode = 'question';
            return;
        }

        // Lọc bỏ 100% phần giải thích
        if (isAns && currentQ) {
            currentQ.answer = isAns[1].toUpperCase();
            currentMode = 'skip';
            return;
        }
        
        if (line.match(/^(Giải thích|Tại sao các lựa chọn khác|Tài liệu được biên soạn|Nghiêm cấm sao chép|Đúng:|Sai:)/i)) {
            currentMode = 'skip';
            return;
        }

        if (currentMode === 'skip') return;

        if (isBuildingContext) {
            if (!line.match(/^(TRẮC NGHIỆM|BASEDOW|BỆNH LÝ BASEDOW|HỘI CHỨNG|ĐỘT QUỴ|ĐỘNG KINH|COPD|ĐÁI MÁU|NỘI KHOA|TEAMDRCAT|==========|Tài liệu được|Nghiêm cấm|\[🛑)/i)) {
                currentContext += line + '\n';
            }
            return;
        }

        if (currentQ) {
            if (isOpt) {
                currentQ.options[isOpt[1].toUpperCase()] = isOpt[2].trim();
                currentMode = 'options';
            } else if (currentMode === 'question') {
                currentQ.question += '\n' + line;
            } else if (currentMode === 'options') {
                const keys = Object.keys(currentQ.options);
                if (keys.length > 0) {
                    const lastKey = keys[keys.length - 1];
                    currentQ.options[lastKey] += '\n' + line;
                }
            } 
        }
    });
    if (currentQ) questions.push(currentQ);
    const cln = (s) => (s||'').replace(/\\[Nn]/g, '\n').replace(/\\n/g, '\n').replace(/\n\s*\n/g, '\n').trim();
    questions.forEach(q => { if(q.context) q.context=cln(q.context); if(q.question) q.question=cln(q.question); for(let k in q.options) q.options[k]=cln(q.options[k]); });
    return questions;
}

const playCorrectSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) { console.error(e); }
};

const playIncorrectSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) { console.error(e); }
};


const RealTimeClock = () => {
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    const formatTime = (date) => {
        const d = date.getDay();
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayStr = days[d];
        const dateStr = date.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'});
        const timeStr = date.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
        return `${timeStr} - ${dayStr}, ${dateStr}`;
    };
    return (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold shadow-sm">
            <i className="fa-regular fa-clock text-blue-500"></i>
            {formatTime(time)}
        </div>
    );
};


const GoogleSearch = () => {
    const [query, setQuery] = React.useState('');
    const [isOpen, setIsOpen] = React.useState(false);
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSearch = (e) => {
        e.preventDefault();
        if(query.trim()) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
            setQuery('');
            setIsOpen(false);
        }
    };

    return (
        <div className="relative z-50">
            <button onClick={() => setIsOpen(!isOpen)} className={`p-2 rounded-xl transition-all duration-300 border shadow-sm ${isOpen ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' : 'bg-white/60 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-600 border-white/40 dark:border-slate-600/50 text-slate-600 dark:text-slate-300'}`} title="Tra cứu Google">
                <i className="fa-brands fa-google text-base"></i>
            </button>
            {isOpen && (
                <React.Fragment>
                    <div className="fixed inset-0 z-[998] cursor-pointer" onTouchStart={(e) => { e.preventDefault(); setIsOpen(false); }} onMouseDown={(e) => { e.preventDefault(); setIsOpen(false); }}></div>
                    <div className="fixed left-4 right-4 top-24 sm:absolute sm:left-auto sm:right-0 sm:top-full mt-3 p-3 glass-panel rounded-2xl shadow-2xl border border-white/60 dark:border-slate-700/60 sm:w-[350px] z-[999] animate-in fade-in slide-in-from-top-2 duration-300">
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Tra cứu Google y khoa..." 
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base text-slate-700 dark:text-slate-200 font-medium transition-all shadow-inner"
                            />
                        </div>
                        <button type="submit" className="p-2.5 btn-gradient text-white rounded-xl shadow-md hover:-translate-y-0.5 transition-transform"><i className="fa-solid fa-arrow-right"></i></button>
                    </form>
                    <div className="mt-2 text-[10px] text-center text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest">Mở trong Tab mới</div>
                <button type="button" onClick={() => setIsOpen(false)} className="mt-3 w-full border border-red-200 bg-red-50 text-red-500 dark:bg-red-900/40 dark:border-red-800 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors shadow-sm">Đóng Tìm Kiếm <i className="fas fa-times ml-1"></i></button>
                </div>
                </React.Fragment>
            )}
        </div>
    );
};

function App() {
    const [appState, setAppState] = useState('locked');
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [pwError, setPwError] = useState(false);
    const [unlockCountdown, setUnlockCountdown] = useState(3);
    const [questions, setQuestions] = useState([]);
    const diseaseName = document.title.replace('NỘI KHOA: ', '').replace(' - TEAMDRCAT', '').replace('TEAMDRCAT | ', '').trim() || 'LÂM SÀNG';
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [flagged, setFlagged] = useState(new Set());
    const [timeRemaining, setTimeRemaining] = useState(0); 
    const [showMatrix, setShowMatrix] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
        const [isDarkMode, setIsDarkMode] = useState(false);
    const [showDrNote, setShowDrNote] = useState(false);
    const [drNoteContent, setDrNoteContent] = useState("");
    const [notePos, setNotePos] = useState({x: window.innerWidth - 320, y: 100});
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);
      const [zoomLevel, setZoomLevel] = useState(100);
    
    const scrollContainerRef = useRef(null);
    const [vantaEffect, setVantaEffect] = useState(null);
    
    useEffect(() => {
        const rootEl = document.getElementById('root');
        if (!vantaEffect && window.VANTA && window.VANTA.NET && rootEl) {
            try {
                if (window.innerWidth < 768) return; // Prevent iOS WebKit crash
                const isMobile = window.innerWidth < 768;
                setVantaEffect(window.VANTA.NET({
                    el: document.body,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.00,
                    minWidth: 200.00,
                    scale: 1.00,
                    scaleMobile: isMobile ? 1.5 : 1.0,
                    color: isDarkMode ? 0xef4444 : 0x3b82f6,
                    backgroundColor: isDarkMode ? 0x0f172a : 0xf8fafc,
                    points: isMobile ? 8.00 : 12.00,
                    maxDistance: isMobile ? 15.00 : 20.00,
                    spacing: isMobile ? 15.00 : 20.00
                }))
            } catch(e) {
                console.warn("Vanta initialize skipped", e);
            }
        }));
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        }
    }, [vantaEffect]);
    
    useEffect(() => {
        if (vantaEffect) {
            vantaEffect.setOptions({
                color: isDarkMode ? 0x22d3ee : 0x0284c7,
                backgroundColor: isDarkMode ? 0x020617 : 0xf0f9ff,
            });
        }
    }, [isDarkMode, vantaEffect]);


    const playHeartbeatSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) { }
    };

    useEffect(() => {
        function b64DecodeUnicode(str) {
            return decodeURIComponent(atob(str).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        }
        const rawB64 = document.getElementById('quizData').textContent.trim() || '';
        let rawData = '';
        try { rawData = b64DecodeUnicode(rawB64); } catch(e) { rawData = rawB64; }
        const parsedQs = parseQuizData(rawData);
        setQuestions(parsedQs);
        
        const unlockKey = 'teamdrcat_unlocked_' + document.title;
        if (localStorage.getItem(unlockKey) === 'true') {
            setAppState('intro');
        }
        
        const storageKey = 'teamdrcat_' + document.title;
        const saved = localStorage.getItem(storageKey);
        if(saved) {
            try {
                const data = JSON.parse(saved);
                setAnswers(data.answers || {});
                setFlagged(new Set(data.flagged || []));
                if (data.timeRemaining) setTimeRemaining(data.timeRemaining);
                else setTimeRemaining(parsedQs.length * 60);
                if (data.currentIndex) setCurrentIndex(data.currentIndex);
                if (data.drNoteContent) setDrNoteContent(data.drNoteContent);
            } catch(e) {
                setTimeRemaining(parsedQs.length * 60);
            }
        } else {
            setTimeRemaining(parsedQs.length * 60);
        }
    }, []);

    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();
        const preventKeyboard = (e) => {
            if (e.keyCode === 123) e.preventDefault();
            if (e.ctrlKey && e.shiftKey && e.keyCode === 73) e.preventDefault();
            if (e.ctrlKey && e.shiftKey && e.keyCode === 74) e.preventDefault();
            if (e.ctrlKey && e.keyCode === 85) e.preventDefault();
            if (e.ctrlKey && e.keyCode === 83) e.preventDefault();
        };
        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('keydown', preventKeyboard);
        document.addEventListener('dragstart', preventDefault);
        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('keydown', preventKeyboard);
            document.removeEventListener('dragstart', preventDefault);
        }
    }, []);

    useEffect(() => {
        if(questions.length > 0 && appState === 'quiz') {
            const storageKey = 'teamdrcat_' + document.title;
            localStorage.setItem(storageKey, JSON.stringify({
                answers: answers,
                flagged: Array.from(flagged),
                timeRemaining: timeRemaining,
                currentIndex: currentIndex,
                drNoteContent: drNoteContent
            }));
        }
    }, [answers, flagged, timeRemaining, questions.length, appState, currentIndex, drNoteContent]);

    useEffect(() => {
        if (appState === 'result' && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [appState]);

    useEffect(() => {
        let timer;
        if (appState === 'quiz' && !isPaused && timeRemaining > 0) {
            timer = setInterval(() => {
                setTimeRemaining(p => {
                    if (p <= 10 && p > 0 && isSoundEnabled) playHeartbeatSound();
                    return p - 1;
                });
            }, 1000);
        } else if (timeRemaining <= 0 && appState === 'quiz') {
            setAppState('result');
        }
        
        return () => clearInterval(timer);
    }, [appState, timeRemaining, isPaused, isSoundEnabled]);

    useEffect(() => {
        if (appState === 'unlocking') {
            if (unlockCountdown > 0) {
                const timer = setTimeout(() => {
                    setUnlockCountdown(c => c - 1);
                    if (isSoundEnabled) playCorrectSound();
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                setAppState('intro');
            }
        }
    }, [appState, unlockCountdown, isSoundEnabled]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if(appState !== 'quiz' || isPaused) return;
            if(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const q = questions[currentIndex];
            if(!q) return;
            const optKeys = Object.keys(q.options);
            const keyMap = {'1':0, '2':1, '3':2, '4':3, 'a':0, 'b':1, 'c':2, 'd':3};
            const mappedIdx = keyMap[e.key.toLowerCase()];
            
            if(mappedIdx !== undefined && mappedIdx < optKeys.length) {
                const selectedKey = optKeys[mappedIdx];
                if (!answers[currentIndex]) {
                    setAnswers(prev => ({ ...prev, [currentIndex]: selectedKey }));
                    if (isSoundEnabled) {
                        q.answer === selectedKey ? playCorrectSound() : playIncorrectSound();
                    }
                }
            }
            if(e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setCurrentIndex(p => Math.min(questions.length - 1, p + 1));
            }
            if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setCurrentIndex(p => Math.max(0, p - 1));
            }
            if(e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                setFlagged(prev => {
                    const newFlagged = new Set(prev);
                    if (newFlagged.has(currentIndex)) newFlagged.delete(currentIndex);
                    else newFlagged.add(currentIndex);
                    return newFlagged;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appState, isPaused, currentIndex, questions, answers, isSoundEnabled]);

    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDarkMode]);

      useEffect(() => {
          document.documentElement.style.fontSize = `${zoomLevel}%`;
      }, [zoomLevel]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startQuiz = () => {
        if (questions.length === 0) {
            alert("Lỗi tải dữ liệu câu hỏi. Vui lòng kiểm tra lại file data.");
            return;
        }
        setAppState('quiz');
        // Restart logic
        if(Object.keys(answers).length === questions.length) {
            setAnswers({}); setFlagged(new Set()); setTimeRemaining(questions.length * 60); setCurrentIndex(0);
        }
        setIsPaused(false);
    };

    const restartQuiz = () => {
        setAppState('intro');
        setAnswers({});
        setFlagged(new Set());
        setTimeRemaining(questions.length * 60);
        setCurrentIndex(0);
        setShowMatrix(false);
        const storageKey = 'teamdrcat_' + document.title;
        localStorage.removeItem(storageKey);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0 });
    };

    const togglePause = () => {
        if (appState === 'quiz') setIsPaused(!isPaused);
    };

    const handleSelectAnswer = (key) => {
        if (answers[currentIndex] || appState !== 'quiz' || isPaused) return;
        
        const isCorrect = questions[currentIndex].answer === key;
        if (isSoundEnabled) {
            if (isCorrect) {
                playCorrectSound();
            } else {
                playIncorrectSound();
            }
        }
        
        setAnswers(prev => ({ ...prev, [currentIndex]: key }));
    };

    const toggleFlag = () => {
        const newFlagged = new Set(flagged);
        if (newFlagged.has(currentIndex)) newFlagged.delete(currentIndex);
        else newFlagged.add(currentIndex);
        setFlagged(newFlagged);
    };

    const calculateScore = () => questions.reduce((acc, q, i) => (answers[i] === q.answer ? acc + 1 : acc), 0);

    const getEncouragement = () => {
        if (questions.length === 0) return null;
        const score = calculateScore();
        const percent = score / questions.length;
        if (percent >= 0.9) return { title: "BÁC SĨ CHUYÊN KHOA CẤP CAO", text: "Vinh danh bạn! Chẩn đoán vô cùng chính xác và hoàn hảo.", icon: "fa-award", color: "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 border-blue-400" };
        if (percent >= 0.7) return { title: "BÁC SĨ NỘI TRÚ XUẤT SẮC", text: "Tuyệt vời. Tư duy lâm sàng của bạn rất vững.", icon: "fa-stethoscope", color: "text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/40 border-cyan-400" };
        if (percent >= 0.5) return { title: "THỰC TẬP SINH TRIỂN VỌNG", text: "Có nền tảng. Cần nạp thêm kiến thức để xử lý ca phức tạp nhé!", icon: "fa-user-nurse", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border-emerald-400" };
        return { title: "CẤP CỨU VIÊN TẬP SỰ", text: "Mức độ khẩn cấp! Kỹ năng trực giác chưa đủ, bạn cần học bài ngay!", icon: "fa-truck-medical", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/40 border-rose-400" };
    };

    
    const renderQuizContent = () => {
        if (isPaused) {
            return (
                <div className="glass-panel rounded-3xl p-16 text-center shadow-2xl animate-in fade-in zoom-in duration-300 mt-10 relative z-10">
                    <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <i className="fa-solid fa-pause text-5xl"></i>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4">Bài thi đang tạm dừng</h2>
                    <button onClick={togglePause} className="btn-gradient text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-lg shadow-blue-300/50 dark:shadow-none hover:shadow-blue-400/50 transition-all">Tiếp tục ngay</button>
                </div>
            );
        }

        if (appState === 'result') {
            const msg = getEncouragement();
            const percent = questions.length > 0 ? calculateScore() / questions.length : 0;
            return (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 mt-4 relative z-10">
                    <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        
                        <div className="relative bg-[#0b1221] dark:bg-black p-8 rounded-[2rem] mb-12 shadow-2xl overflow-hidden border border-slate-700/50">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
                            
                            <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
                                <div className="flex items-center gap-6 text-left w-full md:w-auto">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] shrink-0">
                                        <i className="fa-solid fa-heart-pulse text-4xl"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-rxl md:text-3xl font-black text-white tracking-tight uppercase mb-1">Báo Cáo Hội Chẩn</h2>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-blue-400 font-bold uppercase tracking-widest text-xs">TeamDrCat E-Health</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 md:mt-0 w-full md:w-auto flex justify-end">
                                    {percent < 0.5 ? (
                                        <div className="px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                            <div className="relative flex items-center justify-center w-3 h-3"><span className="absolute w-3 h-3 rounded-full bg-red-500 animate-ping"></span><span className="relative w-2 h-2 rounded-full bg-red-500"></span></div>
                                            KHẨN CẤP
                                        </div>
                                    ) : (percent < 0.8 ? (
                                        <div className="px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                            TRUNG BÌNH
                                        </div>
                                    ) : (
                                        <div className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                            THÔNG THƯỜNG
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-12 w-full">
                            <div className="relative shrink-0">
                                <svg className="w-56 h-56 transform -rotate-90">
                                    <circle cx="112" cy="112" r="90" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                    <circle cx="112" cy="112" r="90" stroke="currentColor" strokeWidth="16" fill="transparent"
                                        strokeDasharray="565.48"
                                        strokeDashoffset={565.48 - (percent * 565.48)}
                                        strokeLinecap="round"
                                        className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-[2000ms] ease-out" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 drop-shadow-sm">{calculateScore()}</span>
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">/ {questions.length} ĐIỂM</span>
                                </div>
                            </div>
                            
                            {msg && (
                                <div className={`p-8 rounded-[2rem] border min-w-[300px] max-w-md w-full flex flex-col gap-3 ${msg.color} backdrop-blur-md shadow-xl relative overflow-hidden group`}>
                                    <div className="absolute -right-10 -bottom-10 opacity-[0.07] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                                        <i className={`fa-solid ${msg.icon} text-9xl`}></i>
                                    </div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="bg-white/50 w-14 h-14 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                            <i className={`fa-solid ${msg.icon} text-2xl`}></i>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-wide leading-tight">{msg.title}</h3>
                                    </div>
                                    <p className="text-base font-semibold opacity-90 relative z-10 leading-relaxed mt-2">{msg.text}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 text-left">
                            <div className="relative glass-panel overflow-hidden group hover:scale-[1.02] transition-all duration-300 rounded-[2rem] border-t-4 border-t-emerald-400 p-6 shadow-xl">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl group-hover:bg-emerald-400/40 transition-all"></div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Đúng</h3>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
                                        <i className="fa-solid fa-check text-xl"></i>
                                    </div>
                                </div>
                                <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-1">{calculateScore()}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Câu trả lời</p>
                            </div>
                            
                            <div className="relative glass-panel overflow-hidden group hover:scale-[1.02] transition-all duration-300 rounded-[2rem] border-t-4 border-t-rose-400 p-6 shadow-xl">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-400/20 rounded-full blur-2xl group-hover:bg-rose-400/40 transition-all"></div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">Sai</h3>
                                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm shrink-0">
                                        <i className="fa-solid fa-xmark text-xl"></i>
                                    </div>
                                </div>
                                <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-1">{Object.keys(answers).length - calculateScore()}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Câu sai sót</p>
                            </div>
                            
                            <div className="relative glass-panel overflow-hidden group hover:scale-[1.02] transition-all duration-300 rounded-[2rem] border-t-4 border-t-slate-400 p-6 shadow-xl">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-400/20 rounded-full blur-2xl group-hover:bg-slate-400/40 transition-all"></div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Chưa làm</h3>
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm shrink-0">
                                        <i className="fa-solid fa-forward text-lg"></i>
                                    </div>
                                </div>
                                <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-1">{questions.length - Object.keys(answers).length}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Bỏ qua / Hết giờ</p>
                            </div>
                            
                            <div className="relative glass-panel overflow-hidden group hover:scale-[1.02] transition-all duration-300 rounded-[2rem] border-t-4 border-t-amber-400 p-6 shadow-xl">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-400/20 rounded-full blur-2xl group-hover:bg-amber-400/40 transition-all"></div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Lưu ý</h3>
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
                                        <i className="fa-solid fa-flag text-lg"></i>
                                    </div>
                                </div>
                                <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-1">{flagged.size}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Câu có cờ</p>
                            </div>
                        </div>

                        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500 flex justify-center items-center shrink-0">
                                    <i className="fa-solid fa-stopwatch text-2xl"></i>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Thời gian trung bình</p>
                                    <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">
                                        {Object.keys(answers).length > 0 ? ((questions.length * 60 - timeRemaining) / Object.keys(answers).length).toFixed(1) : 0} giây <span className="text-sm font-semibold opacity-70">/ câu</span>
                                    </p>
                                </div>
                            </div>
                            <div className="px-5 py-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-sm shrink-0">
                                <i className="fa-solid fa-bolt mr-2"></i> Quyết định thần tốc!
                            </div>
                        </div>

                        <div className="mt-8 mb-10 p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex items-center gap-4 text-left shadow-sm">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                <i className="fa-solid fa-file-pdf text-rose-500 text-xl"></i>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">Bạn có thể tra cứu giải thích đáp án chi tiết trong file PDF do <strong>TEAMDRCAT</strong> biên soạn.</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-5">
                            <button onClick={restartQuiz} className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-lg font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md uppercase tracking-widest hover:-translate-y-1">
                                <i className="fa-solid fa-rotate-right text-xl"></i> Làm lại bài
                            </button>
                            <button onClick={() => { setAppState('review'); setCurrentIndex(0); }} className="flex-1 btn-gradient text-white text-lg font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_10px_20px_-10px_rgba(59,130,246,0.6)] hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.8)] uppercase tracking-widest hover:-translate-y-1 border border-white/20 relative overflow-hidden group">
                                <i className="fa-solid fa-eye text-2xl relative z-10 shrink-0"></i> 
                                <span className="relative z-10">Xem đáp án chi tiết</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (appState === 'review') {
            return (
                <div className="space-y-6 animate-in fade-in duration-300 relative z-10">
                    <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-orange-500 flex items-center justify-between shadow-lg sticky top-0 z-20">
                        <h2 className="text-lg font-black text-orange-600 dark:text-orange-400 uppercase tracking-tight flex items-center gap-2"><i className="fa-solid fa-list-check text-xl"></i> Review Đáp Án</h2>
                    </div>
                    
                    {questions.length > 0 && questions.map((q, index) => {
                        const isSelected = !!answers[index];
                        const isCorrect = answers[index] === q.answer;
                        const isFlagged = flagged.has(index);
                        const showContext = q.context && (index === 0 || q.context !== questions[index - 1].context);
                        
                        let qStatus = <span className="text-slate-500 dark:text-slate-400 font-bold text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg"><i className="fa-solid fa-minus mr-1"></i>Chưa làm</span>;
                        let qTagClass = "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white shadow-sm bg-slate-400 dark:bg-slate-600";
                        let qBoxClass = "glass-panel rounded-[1.5rem] shadow-lg p-6 md:p-8 relative overflow-hidden";

                        if (isSelected) {
                            if (isCorrect) {
                                qStatus = <span className="text-green-700 dark:text-green-300 font-bold text-sm bg-green-100 dark:bg-green-900/50 px-3 py-1 rounded-lg border border-green-200 dark:border-green-800"><i className="fa-solid fa-check mr-1"></i>Chính xác</span>;
                                qTagClass = "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white shadow-sm bg-green-500 dark:bg-green-600";
                                qBoxClass = "glass-panel rounded-[1.5rem] shadow-lg border-l-4 border-l-green-500 p-6 md:p-8 relative overflow-hidden";
                            } else {
                                qStatus = <span className="text-red-700 dark:text-red-300 font-bold text-sm bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-lg border border-red-200 dark:border-red-800"><i className="fa-solid fa-xmark mr-1"></i>Sai</span>;
                                qTagClass = "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white shadow-sm bg-red-500 dark:bg-red-600";
                                qBoxClass = "glass-panel rounded-[1.5rem] shadow-lg border-l-4 border-l-red-500 p-6 md:p-8 relative overflow-hidden";
                            }
                        }
                        
                        return (
                            <div key={index} id={`review-q-${index}`} className={qBoxClass}>
                                {showContext && (
                                    <div className="medical-record-box rounded-xl p-5 mb-8 shadow-sm text-left">
                                        <div className="flex items-center gap-2 mb-3 border-b border-blue-200 dark:border-blue-800 pb-2">
                                            <i className="fa-solid fa-notes-medical text-blue-600 dark:text-blue-400 text-lg"></i>
                                            <span className="font-black text-blue-800 dark:text-blue-300 uppercase text-sm tracking-wide">TÌNH HUỐNG LÂM SÀNG</span>
                                        </div>
                                        <p className="text-slate-800 dark:text-slate-200 text-lg md:text-xl font-bold leading-relaxed whitespace-pre-wrap">{q.context}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className={qTagClass}>Câu {q.id}</span>
                                        {isFlagged && <span className="text-orange-600 dark:text-orange-400 font-bold text-sm bg-orange-100 dark:bg-orange-900/50 px-3 py-1 rounded-lg border border-orange-200 dark:border-orange-800"><i className="fa-solid fa-flag mr-1"></i>Đã cờ</span>}
                                        {qStatus}
                                    </div>
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed mb-6 whitespace-pre-wrap">{q.question}</h3>
                                <div className="grid gap-3 mb-2">
                                    {['A', 'B', 'C', 'D', 'E'].map(key => {
                                        const label = q.options[key];
                                        if (!label) return null;
                                        
                                        const isUserChoice = answers[index] === key;
                                        const isCorrectOption = q.answer === key;
                                        
                                        let btnClass = "w-full p-4 rounded-xl border border-slate-200/60 dark:border-slate-600/60 text-left flex items-center gap-4 relative bg-white/40 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 opacity-60 grayscale";
                                        let spanClass = "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-600";
                                        
                                        if (isCorrectOption) {
                                            btnClass = "w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 relative bg-blue-50/80 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 text-blue-800 dark:text-blue-200 shadow-md ring-1 ring-blue-500 opacity-100 grayscale-0";
                                            spanClass = "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 bg-blue-500 dark:bg-blue-600 text-white shadow-sm border-none";
                                        } else if (isUserChoice) {
                                            btnClass = "w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 relative bg-red-50/80 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 shadow-md opacity-100 grayscale-0";
                                            spanClass = "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 bg-red-500 dark:bg-red-600 text-white shadow-sm border-none";
                                        }
                                        
                                        return (
                                            <div key={key} className={btnClass}>
                                                <span className={spanClass}>{key}</span>
                                                <span className="text-base font-medium leading-relaxed flex-1 pr-8 whitespace-pre-wrap">{label}</span>
                                                {isCorrectOption && <i className="fa-solid fa-circle-check text-2xl text-blue-500 dark:text-blue-400 absolute right-4 top-1/2 -translate-y-1/2 drop-shadow-sm"></i>}
                                                {isUserChoice && !isCorrectOption && <i className="fa-solid fa-circle-xmark text-2xl text-red-500 dark:text-red-400 absolute right-4 top-1/2 -translate-y-1/2 drop-shadow-sm"></i>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        const currentQ = questions[currentIndex];
        const hasAnsweredCurrent = !!answers[currentIndex];
        
        return (
            <div className="space-y-4 relative z-10">
                {questions.length > 0 && currentQ && (
                    <div className="glass-panel rounded-[2rem] shadow-2xl p-6 md:p-8 md:px-10 relative overflow-hidden border-t-4 border-t-blue-500/80">
                        {currentQ.context && (
                            <div className="medical-record-box rounded-2xl p-5 md:p-6 mb-8 shadow-sm text-left animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-3 mb-3 border-b border-blue-200 dark:border-blue-800 pb-3">
                                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                                        <i className="fa-solid fa-file-waveform text-blue-600 dark:text-blue-400 text-lg"></i>
                                    </div>
                                    <span className="font-black text-blue-800 dark:text-blue-300 uppercase text-sm tracking-wider">TÌNH HUỐNG LÂM SÀNG (Dùng cho câu {currentQ.id})</span>
                                </div>
                                <p className="text-slate-800 dark:text-slate-200 text-lg md:text-xl font-bold leading-relaxed whitespace-pre-wrap">{currentQ.context}</p>
                            </div>
                        )}
                                                <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest shadow-md">Câu {currentQ.id}</span>
                                    <span className="text-slate-500 dark:text-slate-400 font-bold text-xs tracking-widest uppercase ml-1">/ {questions.length}</span>
                                </div>
                                <button onClick={toggleFlag} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 shadow-sm hover:-translate-y-0.5 ${flagged.has(currentIndex) ? 'bg-orange-100 dark:bg-orange-900/60 border-orange-400 text-orange-600 dark:text-orange-400' : 'bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-600/80 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                                    <i className={`fa-solid fa-flag text-sm ${flagged.has(currentIndex) ? 'animate-pulse' : ''}`}></i>
                                    <span>Đánh dấu cờ</span>
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full group" title="Tiến độ làm bài">
                                <i className="fa-solid fa-syringe text-blue-600 dark:text-blue-400 text-xl transform -rotate-45"></i>
                                <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600 shadow-inner relative">
                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-500 relative" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}>
                                        <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                                    </div>
                                    <div className="absolute top-0 right-0 h-full w-2 bg-slate-300 dark:bg-slate-600"></div>
                                </div>
                                <span className="text-xs font-black text-blue-700 dark:text-blue-300">{Math.round((Object.keys(answers).length / questions.length) * 100)}%</span>
                            </div>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed mb-8 whitespace-pre-wrap drop-shadow-sm">{currentQ.question}</h3>
                        <div className="grid gap-4">
                            {['A', 'B', 'C', 'D', 'E'].map(key => {
                                const label = currentQ.options[key];
                                if (!label) return null;
                                
                                const isSelected = answers[currentIndex] === key;
                                const isCorrect = currentQ.answer === key;
                                const showAnswerState = hasAnsweredCurrent;
                                
                                let btnClass = "group w-full p-4 md:p-5 rounded-2xl border border-white/60 dark:border-slate-600/50 text-left flex items-center gap-4 option-transition relative bg-white/70 dark:bg-slate-800/70 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow-lg transform hover:-translate-y-1 active:scale-[0.98]";
                                let spanClass = "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 transition-all duration-300 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-sm group-hover:bg-blue-500 dark:group-hover:bg-blue-600 group-hover:text-white border border-slate-200 dark:border-slate-600 group-hover:border-transparent";
                                
                                if (showAnswerState) {
                                    if (isCorrect) {
                                        btnClass = "group w-full p-4 md:p-5 rounded-2xl border-2 text-left flex items-center gap-4 option-transition relative bg-green-50/95 dark:bg-green-900/40 border-green-500 dark:border-green-500 text-green-900 dark:text-green-100 shadow-md ring-4 ring-green-500/20 transform scale-[1.02] z-10";
                                        spanClass = "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 transition-all bg-green-500 dark:bg-green-500 text-white shadow-sm border-none";
                                    } else if (isSelected) {
                                        btnClass = "group w-full p-4 md:p-5 rounded-2xl border-2 text-left flex items-center gap-4 option-transition relative bg-red-50/95 dark:bg-red-900/40 border-red-400 dark:border-red-500 text-red-900 dark:text-red-100 shadow-md ring-4 ring-red-500/20";
                                        spanClass = "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 transition-all bg-red-500 dark:bg-red-500 text-white shadow-sm border-none";
                                    } else {
                                        btnClass = "group w-full p-4 md:p-5 rounded-2xl border text-left flex items-center gap-4 option-transition relative border-slate-200/50 dark:border-slate-700/50 bg-white/30 dark:bg-slate-800/30 text-slate-500 dark:text-slate-500 opacity-50 grayscale";
                                        spanClass = "w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 transition-all bg-slate-100/50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 shadow-none border border-slate-200/50 dark:border-slate-700/50";
                                    }
                                }
                                
                                return (
                                    <button key={key} onClick={() => handleSelectAnswer(key)} disabled={showAnswerState} className={btnClass}>
                                        <span className={spanClass}>{key}</span>
                                        <span className="text-base font-semibold leading-relaxed flex-1 pr-8 whitespace-pre-wrap dark:text-slate-200">{label}</span>
                                        {showAnswerState && isCorrect && <i className="fa-solid fa-circle-check text-3xl text-blue-500 dark:text-blue-400 absolute right-5 top-1/2 -translate-y-1/2 drop-shadow-md animate-in zoom-in duration-300"></i>}
                                        {showAnswerState && isSelected && !isCorrect && <i className="fa-solid fa-circle-xmark text-3xl text-red-500 dark:text-red-400 absolute right-5 top-1/2 -translate-y-1/2 drop-shadow-md animate-in zoom-in duration-300"></i>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {questions.length > 0 && (
                    <React.Fragment>
                    <div className="flex items-center justify-between gap-4 pt-6 pb-4 relative z-10">
                        <button onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0} className="flex-1 glass-panel px-6 py-4 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-0 transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide text-sm shadow-sm hover:shadow-md hover:-translate-y-1">
                            <i className="fa-solid fa-arrow-left text-base"></i> 
                            <span className="hidden sm:inline">Câu trước</span>
                        </button>
                        <button onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))} disabled={currentIndex === questions.length - 1} className="flex-1 btn-gradient text-white px-6 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-blue-500/40 flex items-center justify-center gap-2 uppercase tracking-wide text-sm hover:-translate-y-1">
                            <span className="hidden sm:inline">Câu tiếp</span> 
                            <i className="fa-solid fa-arrow-right text-base"></i>
                        </button>
                    </div>
                    {/* NỘP BÀI BUTTON ADDED */}
                    <div className="mt-2 pb-16 flex justify-center w-full animate-in fade-in slide-in-from-bottom-5 duration-700">
                        <button onClick={() => { if(window.confirm('Bạn có chắc chắn muốn nộp bài?')) { setAppState('result'); setShowMatrix(false); } }} className="w-full sm:w-2/3 md:w-1/2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black py-4 px-8 rounded-[1.5rem] shadow-[0_10px_25px_-5px_rgba(239,68,68,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(239,68,68,0.6)] transform hover:-translate-y-1 transition-all flex items-center justify-center gap-4 text-lg border border-red-400">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
                                <i className="fa-solid fa-paper-plane text-xl"></i>
                            </div>
                            <span className="uppercase tracking-[0.2em] drop-shadow-sm">Nộp Bài Ngay</span>
                        </button>
                    </div>
                    </React.Fragment>
                )}
            </div>
        );
    };

    const handleUnlock = () => {
        if(passwordInput === 'topcaodrcathmu2026') {
            const unlockKey = 'teamdrcat_unlocked_' + document.title;
            localStorage.setItem(unlockKey, 'true');
            setAppState('intro');
        } else {
            setPwError(true);
        }
    };

    if (appState === 'locked') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-transparent z-40 text-center animate-in fade-in duration-500">
                <div className={`max-w-md w-full glass-panel rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center transform transition-all duration-300 ${pwError ? 'animate-shake' : ''}`}>
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner mb-6 relative group">
                        <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700"></div>
                        <i className="fa-solid fa-lock text-3xl"></i>
                    </div>
                    <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-slate-100 mb-2 tracking-tighter">Bảo mật truy cập</h2>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-8 border-b border-slate-200 dark:border-slate-700/50 pb-6 w-full">Vui lòng nhập mật khẩu tài liệu.</p>
                    
                    <div className="relative mb-6">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={passwordInput}
                            onChange={(e) => { setPasswordInput(e.target.value); setPwError(false); }}
                            onKeyDown={(e) => { if(e.key === 'Enter') handleUnlock(); }}
                            className={`w-full px-5 py-4 rounded-xl font-bold bg-white/70 dark:bg-slate-800/70 border-2 outline-none transition-all shadow-sm text-center tracking-[0.3em] text-lg ${pwError ? 'border-red-400 text-red-500 bg-red-50' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 text-slate-800 dark:text-slate-100'}`}
                            placeholder="••••••••••"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-slate-700"
                        >
                            <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xl`}></i>
                        </button>
                    </div>
                    
                    {pwError && <p className="text-red-500 text-xs font-bold uppercase mb-4 tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-top-1"><i className="fa-solid fa-triangle-exclamation"></i> Mật khẩu chưa đúng</p>}
                    
                    <button onClick={handleUnlock} className="w-full btn-gradient text-white text-lg font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:-translate-y-1 transition-all border border-white/20">
                        <i className="fa-solid fa-key"></i> Xác nhận
                    </button>
                    <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-80">Tài liệu nội bộ TEAMDRCAT</p>
                </div>
            </div>
        );
    }

    if (appState === 'unlocking') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-transparent z-40 text-center">
                <div key={unlockCountdown} className="animate-heartbeat flex flex-col items-center justify-center" style={{ animationDuration: '1s' }}>
                    <div className="text-[180px] md:text-[220px] font-black leading-none bg-clip-text text-transparent bg-gradient-to-b from-blue-400 to-cyan-500 drop-shadow-[0_0_40px_rgba(37,99,235,0.8)] filter">
                        {unlockCountdown}
                    </div>
                </div>
            </div>
        );
    }

    if (appState === 'intro') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-transparent">
                
                <div className="absolute top-4 right-4 z-50 flex gap-3">
                    <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-3 glass-panel shadow-lg rounded-full hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 text-slate-600 dark:text-slate-300 hover:scale-110">
                        {isSoundEnabled ? <i className="fa-solid fa-volume-high text-xl text-blue-500"></i> : <i className="fa-solid fa-volume-xmark text-xl text-slate-400"></i>}
                    </button>
                    <button onClick={() => setZoomLevel(prev => Math.min(prev + 10, 150))} title="Phóng to" className="p-3 glass-panel shadow-lg rounded-full hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 text-slate-600 dark:text-slate-300 hover:scale-110">
                          <i className="fa-solid fa-magnifying-glass-plus text-xl text-emerald-500"></i>
                      </button>
                      <button onClick={() => setZoomLevel(prev => Math.max(prev - 10, 50))} title="Thu nhỏ" className="p-3 glass-panel shadow-lg rounded-full hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 text-slate-600 dark:text-slate-300 hover:scale-110">
                          <i className="fa-solid fa-magnifying-glass-minus text-xl text-emerald-500"></i>
                      </button>
                      <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 glass-panel shadow-lg rounded-full hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-300 text-slate-600 dark:text-slate-300 hover:scale-110">
                        {isDarkMode ? <i className="fa-solid fa-sun text-xl text-amber-500"></i> : <i className="fa-solid fa-moon text-xl text-blue-500"></i>}
                    </button>
                </div>
                <div className="max-w-2xl w-full glass-panel rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border-t border-l border-white/80 dark:border-slate-700/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="p-12 pb-8 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-cyan-600/10 dark:from-blue-900/20 dark:to-cyan-900/20 pointer-events-none"></div>
                        <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full mb-6 shadow-xl border border-blue-100 dark:border-slate-700 flex items-center justify-center relative group">
                            <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700"></div>
                            <i className="fa-solid fa-staff-snake text-5xl bg-clip-text text-transparent bg-gradient-to-br from-blue-500 to-cyan-600 drop-shadow-sm text-blue-500"></i>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-3 z-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 drop-shadow-sm">CASE LÂM SÀNG NỘI KHOA</h1>
                        <p className="text-blue-700 dark:text-blue-300 text-lg font-bold tracking-widest uppercase z-10 opacity-80">CHUYÊN ĐỀ: {diseaseName}</p>
                    </div>
                    <div className="p-10 pt-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="flex items-center gap-4 bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md">
                                <div className="bg-blue-100 dark:bg-blue-900/50 w-12 h-12 flex items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 shadow-inner"><i className="fa-solid fa-layer-group text-xl"></i></div>
                                <div><p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1">Tổng câu hỏi</p><p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{questions.length}</p></div>
                            </div>
                            <div className="flex items-center gap-4 bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md">
                                <div className="bg-cyan-100 dark:bg-cyan-900/50 w-12 h-12 flex items-center justify-center rounded-xl text-cyan-600 dark:text-cyan-400 shadow-inner"><i className="fa-regular fa-hourglass-half text-xl"></i></div>
                                <div><p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-1">Thời gian</p><p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{questions.length} Phút</p></div>
                            </div>
                        </div>
                        <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-2xl p-6 mb-10 border border-blue-100 dark:border-blue-800/30 flex items-start gap-4 text-blue-900 dark:text-blue-100 shadow-inner">
                            <i className="fa-solid fa-circle-info shrink-0 mt-0.5 text-2xl text-cyan-600 dark:text-cyan-400"></i>
                            <div className="text-base leading-relaxed font-medium">
                                <p className="font-bold mb-3 text-cyan-800 dark:text-cyan-300 text-lg">Hướng dẫn làm bài:</p>
                                <ul className="list-disc pl-5 space-y-2 opacity-90 marker:text-cyan-600 dark:marker:text-cyan-400">
                                    <li>Kết quả đúng/sai sẽ hiển thị <strong className="text-cyan-900 dark:text-cyan-200 font-bold">ngay lập tức</strong> khi chọn.</li>
                                    <li>Khi đã chọn, bạn <strong className="text-cyan-900 dark:text-cyan-200 font-bold">không thể thay đổi</strong> đáp án của câu đó.</li>
                                    <li>Sử dụng nút <strong className="text-cyan-900 dark:text-cyan-200 font-bold">Đánh dấu cờ</strong> để lưu lại những câu khó.</li>
                                    <li><i className="fa-solid fa-keyboard mr-1 opacity-70"></i> Phím tắt điểu khiển: Ghép <strong className="text-cyan-900 dark:text-cyan-200 font-bold">A, B, C, D</strong> để chọn; <strong className="text-cyan-900 dark:text-cyan-200 font-bold">Mũi tên</strong> để chuyển câu; <strong className="text-cyan-900 dark:text-cyan-200 font-bold">Phím Space</strong> để cắm cờ.</li>
                                    <li>Được biên soạn bởi <strong className="text-cyan-900 dark:text-cyan-200 font-bold">TEAMDRCAT</strong>.</li>
                                </ul>
                            </div>
                        </div>
                        <button onClick={startQuiz} className="w-full btn-gradient text-white text-xl font-black py-5 rounded-2xl transition-all duration-300 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.6)] hover:shadow-[0_15px_25px_-10px_rgba(37,99,235,0.8)] flex items-center justify-center gap-3 uppercase tracking-widest hover:-translate-y-1 active:scale-95 border border-white/20">
                            <i className="fa-solid fa-rocket text-xl"></i> Bắt đầu ngay
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row relative transition-colors duration-1000 z-0">
            {showDrNote && (
                <div className="fixed z-[100] w-72 glass-panel shadow-2xl rounded-2xl overflow-hidden border border-blue-500/50" style={{ right: '2rem', bottom: '2rem', animation: 'slideIn 0.3s ease-out' }} ref={(el) => { if(el && !el.dataset.dragInit) { el.dataset.dragInit = 'true'; el.style.transform = window._drNoteTransform || ''; } }}>
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 flex justify-between items-center text-white cursor-move" style={{ touchAction: 'none' }} onPointerDown={(e) => { if(e.target.closest('button')) return; const el = e.currentTarget; const panel = el.parentElement; el.setPointerCapture(e.pointerId); const startX = e.clientX; const startY = e.clientY; const transformStr = panel.style.transform; let initialDx = 0, initialDy = 0; if(transformStr && transformStr.includes('translate(')) { const match = transformStr.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/); if(match) { initialDx = parseFloat(match[1]); initialDy = parseFloat(match[2]); } } const onMove = (moveEvent) => { const dx = initialDx + (moveEvent.clientX - startX); const dy = initialDy + (moveEvent.clientY - startY); const newTransform = `translate(${dx}px, ${dy}px)`; panel.style.transform = newTransform; window._drNoteTransform = newTransform; }; const onUp = () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.releasePointerCapture(e.pointerId); }; el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); }}>
                        <span className="font-bold flex items-center gap-2"><i className="fa-solid fa-user-doctor"></i> Sổ tay Y lệnh</span>
                        <button onClick={() => setShowDrNote(false)} className="hover:text-red-200 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="p-0">
                        <textarea 
                            value={drNoteContent}
                            onChange={(e) => setDrNoteContent(e.target.value)}
                            placeholder="Ghi chú các thông số bất thường, chẩn đoán sơ bộ..."
                            className="w-full h-48 p-4 bg-yellow-50/90 dark:bg-yellow-900/20 text-slate-800 dark:text-slate-200 resize-none outline-none font-mono text-sm border-none focus:ring-0 custom-scrollbar"
                            style={{ backgroundImage: 'linear-gradient(transparent, transparent 27px, #cbd5e1 28px)', backgroundSize: '100% 28px', lineHeight: '28px' }}
                        ></textarea>
                    </div>
                </div>
            )}
            
            {showMatrix && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setShowMatrix(false)}></div>}
            
            <aside className={`fixed md:sticky top-0 right-0 h-screen w-[85vw] max-w-[320px] md:max-w-none md:w-[400px] glass-panel z-50 flex flex-col transition-transform duration-500 ease-in-out ${showMatrix ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} md:order-2 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] dark:shadow-none border-l border-white/40 dark:border-slate-700/50`}>
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/40 dark:bg-slate-800/40 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-3 uppercase tracking-tighter text-base"><div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400"><i className="fa-solid fa-grip"></i></div> Bảng câu hỏi</h2>
                    <button className="md:hidden text-slate-500 p-2 bg-white/50 dark:bg-slate-700/50 rounded-full hover:bg-white dark:hover:bg-slate-600 transition-colors shadow-sm" onClick={() => setShowMatrix(false)}><i className="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar grid grid-cols-5 gap-3 content-start">
                    {questions.map((q, i) => {
                        let navBtnClass = "h-12 w-full rounded-xl text-sm font-black border transition-all duration-300 relative flex items-center justify-center hover:brightness-95 bg-white/60 dark:bg-slate-700/60 text-slate-500 border-white/50 dark:border-slate-600/50 dark:text-slate-300 shadow-sm hover:-translate-y-1 hover:shadow-md";
                        if (!!answers[i]) {
                            if (answers[i] === q.answer) {
                                navBtnClass = "h-12 w-full rounded-xl text-sm font-black border-2 transition-all duration-300 relative flex items-center justify-center hover:brightness-95 bg-green-100/90 dark:bg-green-900/60 text-green-700 dark:text-green-300 border-green-400/50 dark:border-green-600/50 shadow-sm hover:-translate-y-1";
                            } else {
                                navBtnClass = "h-12 w-full rounded-xl text-sm font-black border-2 transition-all duration-300 relative flex items-center justify-center hover:brightness-95 bg-red-100/90 dark:bg-red-900/60 text-red-700 dark:text-red-300 border-red-400/50 dark:border-red-600/50 shadow-sm hover:-translate-y-1";
                            }
                        }
                        if (currentIndex === i && appState !== 'review') {
                            navBtnClass += " ring-4 ring-blue-500/30 ring-offset-1 dark:ring-offset-slate-800 scale-105 z-10";
                        }
                        if (flagged.has(i)) {
                            navBtnClass += " !border-orange-400 dark:!border-orange-500 !bg-orange-100/90 dark:!bg-orange-900/50 text-orange-700 dark:text-orange-400";
                        }
                        return (
                            <button 
                                key={i} 
                                onClick={() => { 
                                    if (appState === 'review') { 
                                        const target = document.getElementById(`review-q-${i}`); 
                                        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                                    } else { 
                                        setCurrentIndex(i); 
                                    } 
                                    if (window.innerWidth < 768) setShowMatrix(false); 
                                }} 
                                className={navBtnClass}
                            >
                                {i + 1}
                                {flagged.has(i) && <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-orange-400 to-red-500 rounded-full border border-white dark:border-slate-800 shadow-md flex items-center justify-center text-white text-[10px]"><i className="fa-solid fa-flag"></i></div>}
                            </button>
                        );
                    })}
                </div>
                <div className="p-6 pb-28 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md z-10">
                    {appState === 'quiz' ? (
                        <button onClick={() => { setAppState('result'); setShowMatrix(false); }} className="w-full btn-gradient text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest hover:shadow-blue-500/40 transition-all hover:-translate-y-1"><i className="fa-solid fa-paper-plane text-lg"></i> Nộp bài ngay</button>
                    ) : (
                        <button onClick={restartQuiz} className="w-full bg-slate-800 dark:bg-slate-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors shadow-md hover:-translate-y-1"><i className="fa-solid fa-rotate-right text-lg"></i> Làm lại từ đầu</button>
                    )}
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-screen md:order-1 overflow-hidden relative z-10">
                <header className="glass-panel border-b border-white/50 dark:border-slate-700/50 px-4 md:px-6 py-3 md:py-4 flex items-start sm:items-center justify-between sticky top-0 z-30 shadow-sm rounded-none">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 btn-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200/50 dark:shadow-none"><i className="fa-solid fa-staff-snake text-2xl"></i></div>
                        <div className="hidden sm:block"><h1 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight drop-shadow-sm">NỘI KHOA: {diseaseName}</h1><p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-0.5">Tài liệu bởi TeamDrCat</p></div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-3 sm:gap-4 ml-auto" style={{ maxWidth: "calc(100vw - 120px)" }}>
                        <GoogleSearch />
                        <RealTimeClock />
                        <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-2.5 bg-white/60 dark:bg-slate-700/60 rounded-xl hover:bg-white dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-white/40 dark:border-slate-600/50 shadow-sm">
                            {isSoundEnabled ? <i className="fa-solid fa-volume-high text-lg text-blue-500"></i> : <i className="fa-solid fa-volume-xmark text-lg text-slate-400"></i>}
                        </button>
                        <button onClick={() => setZoomLevel(prev => Math.min(prev + 10, 150))} title="Phóng to" className="p-2.5 bg-white/60 dark:bg-slate-700/60 rounded-xl hover:bg-white dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-white/40 dark:border-slate-600/50 shadow-sm">
                              <i className="fa-solid fa-magnifying-glass-plus text-lg text-emerald-500"></i>
                          </button>
                          <button onClick={() => setZoomLevel(prev => Math.max(prev - 10, 50))} title="Thu nhỏ" className="p-2.5 bg-white/60 dark:bg-slate-700/60 rounded-xl hover:bg-white dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-white/40 dark:border-slate-600/50 shadow-sm">
                              <i className="fa-solid fa-magnifying-glass-minus text-lg text-emerald-500"></i>
                          </button>
                          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-white/60 dark:bg-slate-700/60 rounded-xl hover:bg-white dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-white/40 dark:border-slate-600/50 shadow-sm">
                            {isDarkMode ? <i className="fa-solid fa-sun text-lg text-amber-500"></i> : <i className="fa-solid fa-moon text-lg text-blue-500"></i>}
                        </button>
                        {['quiz', 'review', 'result'].includes(appState) && (
                            <React.Fragment>
                        <button onClick={() => setShowDrNote(!showDrNote)} className="p-2.5 bg-yellow-100/80 dark:bg-yellow-900/50 rounded-xl hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors text-yellow-700 dark:text-yellow-400 border border-yellow-300/50 dark:border-yellow-700/50 shadow-sm" title="Mở sổ tay">
                            <i className="fa-solid fa-notes-medical text-lg"></i>
                        </button>
                            </React.Fragment>
                        )}
                        {appState === 'quiz' && (
                            <React.Fragment>
                                <div className={`px-4 py-2 rounded-xl font-mono text-lg font-black border flex items-center gap-3 shadow-sm transition-colors ${timeRemaining < 120 ? 'bg-red-50/90 dark:bg-red-900/50 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 border-2' : 'bg-white/60 dark:bg-slate-700/60 border-white/50 dark:border-slate-600/50 text-blue-700 dark:text-blue-300'}`}>
                                    <i className={`fa-solid fa-heart-pulse text-xl ${timeRemaining < 120 ? 'animate-heartbeat-fast' : 'animate-heartbeat'}`}></i>
                                    {formatTime(timeRemaining)}
                                </div>
                                <button onClick={togglePause} className="p-2.5 bg-white/60 dark:bg-slate-700/60 rounded-xl hover:bg-white dark:hover:bg-slate-600 transition-colors text-blue-600 dark:text-blue-400 border border-white/40 dark:border-slate-600/50 shadow-sm">
                                    {isPaused ? <i className="fa-solid fa-play text-lg"></i> : <i className="fa-solid fa-pause text-lg"></i>}
                                </button>
                            </React.Fragment>
                        )}
                        {appState === 'review' && <div className="px-4 py-2 rounded-xl font-black bg-amber-100/90 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center gap-2 border border-amber-300/50 dark:border-amber-700/50 shadow-sm"><i className="fa-solid fa-eye"></i> <span className="hidden sm:inline uppercase text-xs tracking-wider">Xem lại</span></div>}
                        <button className="md:hidden bg-white/60 dark:bg-slate-700/60 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl flex items-center justify-center border border-white/40 dark:border-slate-600/50 shadow-sm" onClick={() => setShowMatrix(true)}><i className="fa-solid fa-bars text-lg"></i></button>
                    </div>
                </header>

                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-0">
                    <div className="max-w-4xl mx-auto w-full pb-8">
                        {renderQuizContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}


class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null, info: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { this.setState({ error, info }); console.error("REACT CRASH: ", error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{padding: '40px', background: 'white', color: 'red', minHeight: '100vh', zIndex: 99999, position: 'relative'}}>
                    <h1 style={{fontSize: '24px', fontWeight: 'bold'}}>HỆ THỐNG GẶP LỖI (CRASH)</h1>
                    <p style={{marginTop: '10px'}}>{this.state.error && this.state.error.toString()}</p>
                    <pre style={{marginTop: '20px', background: '#ffebee', padding: '15px', borderRadius: '8px', overflow: 'auto', fontSize: '12px'}}>
                        {this.state.info && this.state.info.componentStack}
                    </pre>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{marginTop: '20px', background: 'red', color: 'white', padding: '10px 20px', borderRadius: '8px'}}>Khôi phục / Làm lại từ đầu (Xoá bộ nhớ)</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);

