const PDFDocument = require('pdfkit');

function drawTable(doc, headers, rows, startX, startY, colWidths) {
  const lineHeight = 18;
  let y = startY;
  doc.fontSize(10).text(headers[0], startX, y);
  let x = startX;
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').text(h, x, y, { width: colWidths[i] });
    x += colWidths[i];
  });
  y += lineHeight;
  doc.font('Helvetica');
  rows.forEach(r => {
    let xx = startX;
    r.forEach((cell, i) => {
      doc.text(String(cell), xx, y, { width: colWidths[i] });
      xx += colWidths[i];
    });
    y += lineHeight;
  });
  return y;
}

module.exports.generateOrderReceipt = function(res, order) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=order-${order._id}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text('CropConnect', { align: 'center' });
  doc.fontSize(14).text('Order Receipt', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Order ID: ${order._id}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  doc.text(`Status: ${order.status}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Buyer', { continued: false });
  doc.font('Helvetica')
    .text(`Name: ${order.shipping?.name || 'N/A'}`)
    .text(`Phone: ${order.shipping?.phone || 'N/A'}`)
    .text(`Address: ${order.shipping?.address || 'N/A'}`)
    .text(`Pincode: ${order.shipping?.pincode || 'N/A'}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Seller', { continued: false });
  doc.font('Helvetica')
    .text(`Farmer: ${order.farmer?.name || 'N/A'}`);
  doc.moveDown();

  const headers = ['Item','Qty','Unit Price','Amount'];
  const rows = order.items.map(it => [it.crop, `${it.quantity} kg`, `₹${it.unitPrice}`, `₹${it.total}`]);
  drawTable(doc, headers, rows, 50, doc.y + 10, [220, 80, 120, 120]);
  doc.moveDown();

  doc.text(`Subtotal: ₹${order.subtotal.toFixed(2)}`, { align: 'right' });
  doc.text(`Tax (${(order.taxRate*100).toFixed(0)}%): ₹${order.taxAmount.toFixed(2)}`, { align: 'right' });
  doc.font('Helvetica-Bold').text(`Grand Total: ₹${order.grandTotal.toFixed(2)}`, { align: 'right' });
  doc.font('Helvetica');

  doc.moveDown();
  doc.text('Payment Method: ' + (order.payment?.method || 'COD'));

  doc.end();
};
