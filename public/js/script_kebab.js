var kebabs = document.querySelectorAll('.kebab');
/*kebab[i].onclick = function () {*/
kebabs.forEach(kebab =>
    kebab.addEventListener('click', function () {
        kebab.classList.toggle('active');
    }));