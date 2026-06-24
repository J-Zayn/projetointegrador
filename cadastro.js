document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
    // ==========================================
    const firebaseConfig = {
        apiKey: "AIzaSyC5ZzXiOe8-Zad44M-AMRc8Yczb5nVurpU",
        authDomain: "onibusnaestrada-ad313.firebaseapp.com",
        databaseURL: "https://onibusnaestrada-ad313-default-rtdb.firebaseio.com",
        projectId: "onibusnaestrada-ad313",
        storageBucket: "onibusnaestrada-ad313.firebasestorage.app",
        messagingSenderId: "432204344739",
        appId: "1:432204344739:web:8b89dd476d59578fabbe16",
        measurementId: "G-LZFC78XWFW"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // ==========================================
    // 2. SELEÇÃO DOS ELEMENTOS DA TELA
    // ==========================================
    const stepChoice = document.getElementById('step-choice');
    const formStudent = document.getElementById('form-student');
    const formDriver = document.getElementById('form-driver');

    const btnChooseStudent = document.getElementById('choose-student');
    const btnChooseDriver = document.getElementById('choose-driver');
    const btnBackHome = document.getElementById('back-to-home');
    const btnBackSteps = document.querySelectorAll('.btn-back-step');

    const alertTheme = {
        background: '#06241e',      
        color: '#ffffff',           
        confirmButtonColor: '#ffcc00', 
    };

    // Alternância de Telas
    if (btnChooseStudent) btnChooseStudent.addEventListener('click', () => { stepChoice.classList.add('hidden'); formStudent.classList.remove('hidden'); });
    if (btnChooseDriver) btnChooseDriver.addEventListener('click', () => { stepChoice.classList.add('hidden'); formDriver.classList.remove('hidden'); });
    btnBackSteps.forEach(btn => btn.addEventListener('click', () => { formStudent.classList.add('hidden'); formDriver.classList.add('hidden'); stepChoice.className = ''; }));
    if (btnBackHome) btnBackHome.addEventListener('click', () => { window.location.href = 'index.html'; });

    // ==========================================
    // 3. ENVIO DO ESTUDANTE (Anti-Duplicação + Auto-Login)
    // ==========================================
    formStudent.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('student-name').value.trim();
        const email = document.getElementById('student-email').value.trim().toLowerCase();
        const senha = document.getElementById('student-password').value;

        database.ref('usuarios/estudantes').once('value').then((snapshot) => {
            let emailExiste = false;
            let nomeExiste = false;

            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    if (child.val().email.toLowerCase() === email) emailExiste = true;
                    if (child.val().nome.toLowerCase() === nome.toLowerCase()) nomeExiste = true;
                });
            }

            if (emailExiste || nomeExiste) {
                Swal.fire({ ...alertTheme, title: 'Erro!', text: 'E-mail ou nome já cadastrados.', icon: 'warning' });
                return;
            }

            database.ref('usuarios/estudantes').push({ nome, email, senha, perfil: 'estudante' }).then((ref) => {
                localStorage.setItem('usuarioLogado', JSON.stringify({ id: ref.key, nome, perfil: 'estudante' }));
                window.location.href = 'dashboard.html';
            });
        });
    });

    // ==========================================
    // 4. ENVIO DO MOTORISTA (Código Secreto + Auto-Login)
    // ==========================================
    formDriver.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('driver-name').value.trim();
        const codigo = document.getElementById('driver-token').value.trim().toUpperCase();
        const senha = document.getElementById('driver-password').value;

        database.ref('codigos_autorizados/' + codigo).once('value').then((snapshot) => {
            if (!snapshot.exists() || snapshot.val().usado === true) {
                Swal.fire({ ...alertTheme, title: 'Erro!', text: 'Código inválido ou já utilizado.', icon: 'error' });
                return;
            }

            database.ref('usuarios/motoristas/' + codigo).set({ nome, codigo, senha, perfil: 'motorista' }).then(() => {
                database.ref('codigos_autorizados/' + codigo).update({ usado: true });
                localStorage.setItem('usuarioLogado', JSON.stringify({ id: codigo, nome, perfil: 'motorista' }));
                window.location.href = 'dashboard.html';
            });
        });
    });
});
