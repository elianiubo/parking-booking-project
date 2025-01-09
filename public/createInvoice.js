// const fs = require("fs");
import fs from 'fs';
import PDFDocument from 'pdfkit';
import stream from 'stream';
// const PDFDocument = require("pdfkit");

async function createInvoice(invoice, db) {
  let doc = new PDFDocument({ size: "A4", margin: 50 });

  const bufferStream = new stream.PassThrough();
  doc.pipe(bufferStream); // Pipe the PDF document to the buffer stream
  // Ensure that invoice.items is always an array
  if (!Array.isArray(invoice.items)) {
    invoice.items = [];
  }
  console.log('DB CLIENT' + db); // Log the dbClient to check if it's initialized

  generateHeader(doc, invoice);
  generateCustomerInformation(doc, invoice);
  generateCustomInvoiceTable(doc, invoice);
  generateFooter(doc);

  console.log("Invoice Object:", invoice); // Debugging the invoice structure


  doc.end();
  // Once the PDF is generated, you can retrieve it as a buffer
  const pdfBuffer = await new Promise((resolve, reject) => {
    let chunks = [];
    bufferStream.on('data', chunk => chunks.push(chunk));
    bufferStream.on('end', () => resolve(Buffer.concat(chunks)));
    bufferStream.on('error', reject);
  });

  // Save the PDF buffer to your database (e.g., MongoDB, SQL)
  // Save the PDF buffer to your PostgreSQL database
  await savePdfToDatabase(db, invoice.bookingId, pdfBuffer, invoice);


}

function generateHeader(doc, invoice) {
  doc
    //.image("/assets/images/logo.png", 50, 45, { width: 50 })
    .fillColor("#444444")
    .fontSize(20)
    .text("Cheap Parking Eindhoven", 90, 57, { align: "center" })
    .fontSize(10)
    .text(invoice.address1, 200, 100, { align: "right" })
    .text(invoice.address2, 210, 115, { align: "right" })
    .text(invoice.address3, 220, 125, { align: "right" })
    .text(`KVK: ${invoice.kvk} VAT Number: ${invoice.vat_number}`, 230, 135, { align: "right" })
    .moveDown();
}

function generateCustomerInformation(doc, invoice) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Invoice", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(10)
    .text("Invoice Number:", 50, customerInformationTop)
    .font("Helvetica-Bold")
    .text(invoice.invoiceNumber, 150, customerInformationTop)
    .font("Helvetica")
    .text("Invoice Date:", 50, customerInformationTop + 15)
    .text(invoice.invoiceDate, 150, customerInformationTop + 15)
    .text("Customer Name:", 50, customerInformationTop + 30)
    .text(invoice.customerName, 150, customerInformationTop + 30)
    .text("Email:", 50, customerInformationTop + 45)
    .text(invoice.customerEmail, 150, customerInformationTop + 45)
    .moveDown();

  generateHr(doc, 267);
}

function generateCustomInvoiceTable(doc, invoice) {
  const invoiceTableTop = 320;

  doc
    .fontSize(12)
    .text("Description", 50, invoiceTableTop, { bold: true })
    .text(" Days reserved", 100, invoiceTableTop, { bold: true, align: "center" })
    .text("Total ", 150, invoiceTableTop, { bold: true, align: "right" });

  generateHr(doc, invoiceTableTop + 15);
  let position = invoiceTableTop + 30
  // Check if invoice.items is defined and is an array
  // Check if invoice.items is an array and has items
  if (Array.isArray(invoice.bookings) && invoice.bookings.length > 0) {
    invoice.bookings.forEach(item => {
      const totalAmount = parseFloat(item.totalAmount); // Ensure it is a number
      doc
        .fontSize(10)
        .text(item.description, 50, position)
        .text(item.totalDays, 100, position, { align: "center" })
        .text(`€ ${totalAmount.toFixed(2)}`, 150, position, { align: "right" });
      position += 20; // Update position for the next row
    });
  } else {
    // If no items are found, display a message and ensure position is updated
    doc
      .fontSize(10)
      .text("No items available", 50, position);
    position += 20; // Update position after displaying message
  }

  // Add total summary
  generateHr(doc, position);
  // Ensure grandTotal is a valid number before calling toFixed
  const grandTotal = invoice.grandTotal && !isNaN(invoice.grandTotal) ? invoice.grandTotal : 0; // Fallback to 0 if grandTotal is invalid
  const priceExclVAT = grandTotal / 1.21; // Calculate price excluding VAT
  const vatAmount = grandTotal - priceExclVAT; // Calculate VAT amount
  // Log values for debugging (optional)
  console.log("Price Excl. VAT:", priceExclVAT.toFixed(2));
  console.log("VAT (21%):", vatAmount.toFixed(2));
  console.log("Grand Total:", grandTotal.toFixed(2));
  // Show the VAT breakdown
  position += 10; // Add spacing before VAT breakdown
  doc
    .fontSize(12)
    .text('Price (Excl. VAT)', 50, position)
    .text(`€ ${priceExclVAT.toFixed(2)}`, 400, position, { align: 'right' });
  position += 20;

  doc
    .fontSize(12)
    .text('VAT (21%)', 50, position)
    .text(`€ ${vatAmount.toFixed(2)}`, 400, position, { align: 'right' });
  position += 20;

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text('Total (Incl. VAT)', 50, position)
    .text(`€ ${grandTotal.toFixed(2)}`, 400, position, { align: 'right' });

  position += 30;
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .fillColor("#666666")
    .text("Thank you for choosing Cheap Parking Eindhoven!", 50, 700, { align: "center", width: 500 })
    .moveDown(1)
    .text("Ensure your parking slot is cleared upon departure.", 50, 720, { align: "center", width: 500 })
  // .list([
  //   "Ensure your parking slot is cleared upon departure.",
  //   "For any issues, contact us at: info@cheapparkingeindhoven.nl",
  //   // "Additional fees may apply for overtime parking.",
  // ], { bulletRadius: 2, textIndent: 10, lineGap: 4 });
}
async function savePdfToDatabase(db, bookingId, pdfBuffer, invoice) {
  const insert = `
    INSERT INTO invoices (booking_id, pdf_data, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id;
  `;

  const values = [bookingId, pdfBuffer];

  try {
    const res = await db.query(insert, values); // db.query should be used here
    console.log('PDF successfully saved to database:', res);
  } catch (error) {
    console.error('Error saving PDF to database:', error);
  }
}

// // Example invoice object
// const invoice = {
//   bookingId: '355',
//   name: 'Elia Niubo Burgos',
//   email: 'elia.nibu@gmail.com',
//   totalPrice: 49.00,
//   items: [
//     {
//       description: 'Parking Reservation',
//       totalDays: 2,
//       totalAmount: 49.00
//     }
//   ]
// };



function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}
// Create and store the invoice PDF
// createInvoice(invoice)
//   .then(() => console.log('Invoice created and saved to database'))
//   .catch(console.error);


export { createInvoice };
