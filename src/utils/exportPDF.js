export async function exportPDF(ref) {
  if (typeof window === "undefined" || !ref?.current) {
    console.warn("PDF export skipped: not in browser or ref is null.");
    return;
  }

  try {
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf().from(ref.current).set({ margin: 1, filename: 'proforma.pdf' }).save();
  } catch (error) {
    console.error("PDF export failed:", error);
  }
}
