function fitCertificateToViewport() {
    const shell = document.getElementById("certificatePreviewShell");
    const sizer = document.getElementById("certificateSizer");
    const stage = document.getElementById("certificateScaleStage");
    const certificate = document.querySelector(".certificate");

    if (!shell || !sizer || !stage || !certificate) return;

    // Reset inline sizing to measure true A4 dimensions
    sizer.style.width = "";
    sizer.style.height = "";
    stage.style.position = "";
    stage.style.top = "";
    stage.style.left = "";
    stage.style.transform = "";

    const shellStyles = window.getComputedStyle(shell);
    const horizontalPadding =
        parseFloat(shellStyles.paddingLeft || "0") +
        parseFloat(shellStyles.paddingRight || "0");
    const availableWidth = Math.max(240, shell.clientWidth - horizontalPadding);

    const certWidth = certificate.offsetWidth;
    const certHeight = certificate.offsetHeight;

    if (certWidth > 0 && availableWidth < certWidth) {
        const scale = availableWidth / certWidth;
        sizer.style.width = `${Math.floor(certWidth * scale)}px`;
        sizer.style.height = `${Math.ceil(certHeight * scale)}px`;
        stage.style.position = "absolute";
        stage.style.top = "0";
        stage.style.left = "0";
        stage.style.transform = `scale(${scale})`;
    } else {
        sizer.style.width = `${certWidth}px`;
        sizer.style.height = `${certHeight}px`;
    }
}

document.addEventListener("DOMContentLoaded", fitCertificateToViewport);
window.addEventListener("resize", fitCertificateToViewport);

async function downloadCertificate() {
    const shell = document.getElementById("certificatePreviewShell");
    const certificate = document.querySelector(".certificate");
    const downloadBtn = document.getElementById("downloadCertBtn");

    if (!certificate) return;

    const originalLabel = downloadBtn ? downloadBtn.innerHTML : "";
    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Generating PDF...';
    }

    if (shell) {
        shell.classList.add("pdf-exporting");
    }

    const certWidth = certificate.offsetWidth;
    const certHeight = certificate.offsetHeight;

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
            scrollY: 0,
            windowWidth: Math.max(window.innerWidth, certWidth + 40),
            onclone: function (clonedDoc) {
                const clonedWrapper = clonedDoc.querySelector(".certificate-page-wrapper");
                const clonedShell = clonedDoc.getElementById("certificatePreviewShell");
                const clonedSizer = clonedDoc.getElementById("certificateSizer");
                const clonedStage = clonedDoc.getElementById("certificateScaleStage");
                const clonedCert = clonedDoc.querySelector(".certificate");

                if (clonedWrapper) {
                    clonedWrapper.style.margin = "0";
                    clonedWrapper.style.padding = "0";
                    clonedWrapper.style.overflow = "visible";
                }
                if (clonedShell) {
                    clonedShell.style.padding = "0";
                    clonedShell.style.overflow = "visible";
                    clonedShell.style.display = "block";
                }
                if (clonedSizer) {
                    clonedSizer.style.width = "auto";
                    clonedSizer.style.height = "auto";
                    clonedSizer.style.overflow = "visible";
                }
                if (clonedStage) {
                    clonedStage.style.position = "static";
                    clonedStage.style.transform = "none";
                }
                if (clonedCert) {
                    clonedCert.style.margin = "0";
                    clonedCert.style.boxShadow = "none";
                }
            }
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

    try {
        await html2pdf()
            .set(options)
            .from(certificate)
            .save();
    } finally {
        if (shell) {
            shell.classList.remove("pdf-exporting");
        }
        fitCertificateToViewport();
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalLabel;
        }
    }
}
