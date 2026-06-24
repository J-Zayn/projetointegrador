document.addEventListener('DOMContentLoaded', () => {
    // Configurações do Firebase
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

    const formLogin = document.getElementById('form-login');
    const alertTheme = { background: '#06241e', color: '#ffffff', confirmButtonColor: '#ffcc00' };

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nomeDigitado = document.getElementById('login-identifier').value.trim().toLowerCase();
        const senha = document.getElementById('login-password').value;

        // 1. Tenta buscar nos estudantes
        const snapEstudantes = await database.ref('usuarios/estudantes').once('value');
        let usuarioEncontrado = null;
        let tipo = null;

        snapEstudantes.forEach(child => {
            if (child.val().nome.toLowerCase() === nomeDigitado && child.val().senha === senha) {
                usuarioEncontrado = child.val();
                tipo = 'estudante';
            }
        });

        // 2. Se não achou em estudantes, busca nos motoristas
        if (!usuarioEncontrado) {
            const snapMotoristas = await database.ref('usuarios/motoristas').once('value');
            snapMotoristas.forEach(child => {
                if (child.val().nome.toLowerCase() === nomeDigitado && child.val().senha === senha) {
                    usuarioEncontrado = child.val();
                    tipo = 'motorista';
                }
            });
        }

        // 3. Resultado da busca
        if (usuarioEncontrado) {
            localStorage.setItem('usuarioLogado', JSON.stringify({ 
                nome: usuarioEncontrado.nome, 
                perfil: tipo 
            }));
            window.location.href = 'dashboard.html';
        } else {
            Swal.fire({ ...alertTheme, title: 'Erro!', text: 'Nome ou senha incorretos.', icon: 'error' });
        }
    });
});
