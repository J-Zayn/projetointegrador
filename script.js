document.addEventListener('DOMContentLoaded', () => {
    
    const btnLogin = document.querySelector('.btn-primary');
    const btnRegister = document.querySelector('.btn-secondary');

    // Redireciona para a página de login
    btnLogin.addEventListener('click', () => {
        window.location.href = 'login.html';
    });

    // Redireciona para a página de cadastro
    btnRegister.addEventListener('click', () => {
        window.location.href = 'cadastro.html';
    });

});
