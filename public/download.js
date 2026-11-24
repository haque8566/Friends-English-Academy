function downloadCertificate() {

    const certificate = document.querySelector(".certificate");

    const options = {
        margin: 0,
        filename: "Friends-English-Academy-Certificate.pdf",

        image: {
            type: "jpeg",
            quality: 1
        },

        html2canvas: {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0
        },

        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
        },

        pagebreak: {
            mode: ["avoid-all", "css"]
        }
    };

    html2pdf()
        .set(options)
        .from(certificate)
        .save();
}