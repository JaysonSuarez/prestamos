import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtCOP, fmtDate, calcMoraAcum, getEstado } from "../utils/helpers";
import { toast } from "react-toastify";

export const exportToPDF = (cliente, prestamo, cuotas) => {
  try {
    const doc = new jsPDF();
    const cuotasP = cuotas.filter(c => c.prestamoId === prestamo.prestamoId)
                         .sort((a,b) => a.numeroCuota - b.numeroCuota);

    // Header
    doc.setFillColor(63, 63, 63);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ESTADO DE CUENTA", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("PRÉSTAMOS PRO — PORTAFOLIO DE CRÉDITOS", 105, 30, { align: "center" });

    // Client Info
    doc.setTextColor(42, 42, 42);
    doc.setFontSize(12);
    doc.text(`Cliente: ${cliente.nombre} ${cliente.apellido}`, 15, 55);
    doc.text(`Identificación: ${cliente.cc}`, 15, 62);
    doc.text(`Teléfono: ${cliente.telefono}`, 15, 69);
    doc.text(`Préstamo ID: ${prestamo.prestamoId}`, 15, 76);

    // Summary Box
    doc.setFillColor(250, 249, 246);
    doc.roundedRect(120, 50, 75, 35, 3, 3, 'F');
    doc.setFontSize(9);
    doc.text("Capital Prestado:", 125, 58);
    doc.text(fmtCOP(prestamo.importe), 185, 58, { align: "right" });
    doc.text("Cuotas Pactadas:", 125, 65);
    doc.text(`${prestamo.numeroCuotas} (${prestamo.modalidad})`, 185, 65, { align: "right" });
    
    // Portfolio Calculation
    const pagado = cuotasP.filter(c => c.estado === "pagado")
                         .reduce((acc, c) => acc + c.importeCuota, 0);
    
    // Fixed: Current balance should be TotalAPagar - Pagado
    const pendiente = prestamo.totalAPagar - pagado;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DEUDA ORIGINAL:", 125, 74);
    doc.text(fmtCOP(prestamo.totalAPagar), 185, 74, { align: "right" });

    doc.setTextColor(207, 68, 68);
    doc.text("SALDO ACTUAL (K+INT):", 125, 81);
    doc.text(fmtCOP(pendiente), 185, 81, { align: "right" });

    // Table
    const head = [["N°", "Vencimiento", "Importe", "Mora", "Recargo", "Total", "Estado"]];
    const body = cuotasP.map(c => {
      const mora = calcMoraAcum(c.importeCuota, prestamo.modalidad, c.fechaVencimiento, c.estado);
      const rowTotal = c.importeCuota + mora;
      return [
        c.numeroCuota,
        fmtDate(c.fechaVencimiento),
        fmtCOP(c.importeCuota),
        calcMoraAcum(c.importeCuota, prestamo.modalidad, c.fechaVencimiento, c.estado) > 0 ? "SÍ" : "NO",
        fmtCOP(mora),
        fmtCOP(rowTotal),
        getEstado(c).toUpperCase()
      ];
    });

    autoTable(doc, {
      head, body,
      startY: 90,
      theme: 'grid',
      headStyles: { fillColor: [63, 63, 63], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        2: { halign: 'right' },
        4: { halign: 'right', textColor: [207, 68, 68] },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center' }
      }
    });

    doc.save(`Estado_Cuenta_${cliente.cc}_${prestamo.prestamoId}.pdf`);
    toast.success("PDF generado con éxito");
  } catch (err) {
    console.error(err);
    toast.error("Error al generar PDF");
  }
};
