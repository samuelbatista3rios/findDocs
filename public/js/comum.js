
// TOAST
const toast = (message, type) => {
    var toast = document.createElement("div");
    toast.classList.add("toast", "fs-6");
    switch (type) {
        case "success":
            toast.classList.add("bg-success", "text-white");
            break
        case "info":
            toast.classList.add("bg-info", "text-white");
            break
        case "danger":
            toast.classList.add("bg-danger", "text-white");
            break
        default:
            toast.classList.add("bg-secondary");
            break
    }
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    // Adicionar conteúdo ao toast
    toast.innerHTML = `
    <div class="d-flex">
        <div class="toast-body">
            ${message}
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
    document.getElementById("toastContainer").appendChild(toast);
    var bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
}

// Download do arquivo vinculado ao botao
const download = async (path, userId, fileName) => {
    var link = document.createElement("a");
    link.href = `${path}/${userId}/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Exibe o carregamento de tela
const loading = (op, msg) => {
    const loadingEl = document.querySelector("#loading-screen")
    const loadingMsg = document.querySelector("#loadingMsg")
    const loadingImg = document.querySelector("#loadingImg")

    const imgId = Math.floor(Math.random() * 10)
    loadingImg.src = `imgs/loading_1.gif`
    loadingMsg.innerHTML = msg
    if (op == 1) {
        loadingEl.classList.contains("d-none") ? loadingEl.classList.remove("d-none") : false
    } else {
        !loadingEl.classList.contains("d-none") ? loadingEl.classList.add("d-none") : false
    }
}

// Seleciona todos os checkbox
const selectAll = () => {
    if (!checkedStatus) {
        checkboxes.forEach(c => c.checked = true)
        checkedStatus = true
    } else {
        checkboxes.forEach(c => c.checked = false)
        checkedStatus = false
    }
}

// Remove/Adiciona classe de um elemento
const removeClass = (element, className) => {
    element.classList.contains(className) ? element.classList.remove(className) : false
}
const addClass = (element, className) => {
    !element.classList.contains(className) ? element.classList.add(className) : false
}
// Onchange select de setor
const changeSetor = () => {
    switch (setorSolicitante.value) {
        case "SESMT":
            removeClass(sesmt_options, "d-none")
            break
        default:
            addClass(sesmt_options, "d-none")
            break
    }
}

const ElTooltip = document.querySelector("#tooltip")
const tooltip = new bootstrap.Tooltip(ElTooltip)