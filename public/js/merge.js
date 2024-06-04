
// ENVIO DO FORM MERGEFILES
mergeDocsForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    loading(1, "")
    btnSend2.disabled = true
    var cpFile = cpFile.value
    var docFile = docFile.value
    var formData = { cpFile, docFile }
    try {
        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        };

        await fetch("/mergeFiles", options)
            .then(res => res.json())
            .then(res => {
                if (res.status == 200) {
                    toast(res.msg, "success")
                } else {
                    toast(res.msg, "danger")
                }
            })
            .catch(err => toast(err, "danger"))
            .finally(() => {
                loading(0);
                btnSend2.disabled = false
            });
    } catch (error) {
        console.log("Erro ao enviar formulario: " + error)
    }
})