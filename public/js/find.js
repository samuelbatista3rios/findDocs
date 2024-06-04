// ENVIO DO FORM FINDDOCS
findDocsForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    loading(1, "")
    btnSend.disabled = true
    var CODFILIAL = unidadeGerenciada.value
    var DATABAIXAINICIO = dataInicio.value
    var DATABAIXAFIM = dataFim.value
    var SETOR = setorSolicitante.value
    var TIPO = tipoDoc.value
    var formData = {
        CODFILIAL,
        DATABAIXAINICIO,
        DATABAIXAFIM,
        SETOR,
        TIPO
    }
    try {
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        };

        await fetch("/find", options)
            .then(res => res.json())
            .then(res => {
                if (res.status == 200) {
                    toast(res.msg, "success")
                    actions.classList.remove("d-none")
                    actions.querySelector("#downloadPln").href = `download/${res.userId}/${res.xlsFileName}`
                    if (res.setor != "Financeiro") {
                        actions.querySelector("#baixarArquivos").classList.remove("d-none")
                        actions.querySelector("#downloadBtn").href = `download/${res.userId}/${res.zipFileName}`
                    }
                } else {
                    toast(res.msg, "danger")
                }
            })
            .catch(err => toast(err, "danger"))
            .finally(() => {
                loading(0);
                btnSend.disabled = false
            });
    } catch (error) {
        console.log("Erro ao enviar formulario: " + error)
    }
})

// Carrega as filiais para selecao
const carregaFiliais = async () => {
    var formData = {
        url: "/api/public/ecm/dataset/search?datasetId=branchs",
        method: "GET",
        env: "prod",
        body: null
    }
    try {
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        };

        await fetch("/fluig", options)
            .then(res => res.json())
            .then(res => {
                if (res.status == 200) {
                    let branchs = res.msg.sort((f1, f2) => (parseInt(f1.branch) > parseInt(f2.branch)) ? 1 : (parseInt(f1.branch) < parseInt(f2.branch)) ? -1 : 0);
                    for (const f of branchs) {
                        unidadeGerenciada.appendChild(new Option(f.branch + ") " + f.branchName, f.branch))
                    }
                }
            })
            .catch(err => toast(res.msg, "danger"));
    } catch (error) {
        toast(error, "danger")
    }
}

// Controla os options de acordo com o setor do usuario
const controlOptions = (userGroups) => {
    const slt = document.querySelector("#setorSolicitante")
    userGroups = userGroups.split(",")
    for (const op of slt.options) {
        if (userGroups.find(g => g == op.getAttribute("data-setor"))) {
            op.classList.remove("d-none")
        }
    }
    return userGroups
}

document.addEventListener("DOMContentLoaded", async () => {
    await carregaFiliais()
    // controlOptions("<%= userGroups %>")
})