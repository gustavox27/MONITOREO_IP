# Testing Guide - Export Functions (PDF and MHTML)

## Prerequisites
- Application running on `npm run dev`
- Multiple devices added with different types (printer, server, router, etc.)
- Both online and offline devices for comprehensive testing

## Test Case 1: PDF Export - Basic Functionality

**Objective:** Verify PDF export works without errors and downloads correctly

**Steps:**
1. Open the application in browser
2. Navigate to "Monitor de Dispositivos" (Monitoring View)
3. Click the "Reporte" (Report) button in the top toolbar
4. From the dropdown menu, click "PDF"
5. Wait for the download to complete

**Expected Result:**
- ✓ No error messages appear in browser console
- ✓ PDF file downloads with name format: `Reporte_Dispositivos_DD-MM-YYYY.pdf`
- ✓ File opens successfully in PDF reader
- ✓ No console errors like "TypeError: doc.autoTable is not a function"

**Verification Checklist:**
- [ ] File downloads successfully
- [ ] File opens in PDF reader
- [ ] No errors in browser console
- [ ] PDF contains report title with date

---

## Test Case 2: PDF Export - Content Verification

**Objective:** Verify PDF contains all correct data with proper formatting

**Steps:**
1. Complete Test Case 1
2. Open the downloaded PDF
3. Verify each section

**Expected Result - Header Section:**
- ✓ Title: "Reporte Dispositivos: Planta Huachipa DD-MM-YYYY"
- ✓ Subtitle: "Generado: DD/MM/YYYY HH:MM:SS" with current timestamp

**Expected Result - Table Header:**
- ✓ Column headers: Tipo, Dispositivo, IP, Estado, Respuesta, Actividad, Última Caída, Último Cambio
- ✓ Header background color is dark gray (matches UI theme)
- ✓ Header text is white and bold

**Expected Result - Table Content:**
- ✓ All devices are listed with their data
- ✓ Device names match what's in the application
- ✓ IP addresses are correctly displayed
- ✓ Status shows "EN LÍNEA" or "FUERA DE LÍNEA"
- ✓ Response times show with "ms" suffix or "N/A"
- ✓ All timestamps are properly formatted

**Expected Result - Formatting:**
- ✓ Alternating row colors (white and light gray) for readability
- ✓ Offline devices have distinct red background highlighting
- ✓ All text is readable with good contrast
- ✓ Table fits properly on page (landscape orientation)

**Verification Checklist:**
- [ ] All header sections present and correct
- [ ] All device columns have data
- [ ] Formatting is professional and readable
- [ ] Offline devices are visually distinct
- [ ] No truncated or missing data

---

## Test Case 3: PDF Export - Multiple Device Types

**Objective:** Verify PDF correctly displays data for all device types

**Prerequisites:**
- Devices with various types: printer_laser, printer_label, clock, server, laptop, ups, modem, router

**Steps:**
1. Navigate to Monitoring View
2. Ensure you can see devices of multiple types in the table
3. Export to PDF (Test Case 1 steps 3-4)
4. Open PDF and verify each device type

**Expected Result:**
- ✓ All device types display their Spanish labels correctly:
  - printer_laser → "Impresora Láser"
  - printer_label → "Impresora Etiquetadora"
  - clock → "Reloj"
  - server → "Servidor"
  - laptop → "Laptop"
  - ups → "UPS"
  - modem → "Módem"
  - router → "Router"
  - generic → "Dispositivo Genérico"

**Verification Checklist:**
- [ ] Printer devices show correct label
- [ ] Server devices show correct label
- [ ] Clock devices show correct label
- [ ] Router devices show correct label
- [ ] UPS devices show correct label
- [ ] Modem devices show correct label
- [ ] Laptop devices show correct label

---

## Test Case 4: HTML Export - Basic Functionality

**Objective:** Verify HTML export works and file downloads correctly

**Steps:**
1. Open the application in browser
2. Navigate to "Monitor de Dispositivos" (Monitoring View)
3. Click the "Reporte" (Report) button
4. From the dropdown menu, click "Página HTML"
5. Wait for the download to complete

**Expected Result:**
- ✓ No error messages appear in browser console
- ✓ HTML file downloads with name format: `Reporte_Dispositivos_DD-MM-YYYY.html`
- ✓ File can be opened in web browser
- ✓ No JavaScript errors in browser console

**Verification Checklist:**
- [ ] File downloads successfully
- [ ] File opens in web browser
- [ ] No console errors
- [ ] Page loads completely

---

## Test Case 5: HTML Export - SVG Icons Display

**Objective:** Verify SVG icons display correctly in HTML export with proper colors

**Steps:**
1. Complete Test Case 4
2. Open the downloaded HTML file in web browser
3. Look at the "Tipo" (Type) column

**Expected Visual Result - Icon Display:**
- ✓ Each device type shows a colored icon box next to the device type label
- ✓ Icons are positioned to the left of the text
- ✓ Icons have rounded corners and colored background
- ✓ Each icon has distinct color matching the device type:

| Device Type | Icon Color | Background |
|------------|-----------|-----------|
| Impresora Láser | Purple (#9333ea) | Light Purple (#f3e8ff) |
| Impresora Etiquetadora | Purple (#9333ea) | Light Purple (#f3e8ff) |
| Reloj | Blue (#2563eb) | Light Blue (#dbeafe) |
| Servidor | Green (#16a34a) | Light Green (#dcfce7) |
| Laptop | Indigo (#4f46e5) | Light Indigo (#e0e7ff) |
| UPS | Orange/Yellow (#d97706) | Light Yellow (#fef3c7) |
| Módem | Cyan (#0891b2) | Light Cyan (#cffafe) |
| Router | Orange (#ea580c) | Light Orange (#fed7aa) |
| Genérico | Gray (#4b5563) | Light Gray (#f3f4f6) |

**Expected Result - Icon Types:**
- ✓ Printer icons show printer symbol
- ✓ Clock icons show clock symbol
- ✓ Server icons show server/monitor symbol
- ✓ Laptop icons show laptop symbol
- ✓ UPS icons show battery symbol
- ✓ Modem icons show wifi/signal symbol
- ✓ Router icons show router symbol
- ✓ Generic icons show hard drive symbol

**Verification Checklist:**
- [ ] Icons are visible for all devices
- [ ] Each icon has correct color
- [ ] Icons are properly aligned with text
- [ ] Icons display as vector graphics (sharp on any zoom level)
- [ ] Icon colors match the color scheme from the application UI

---

## Test Case 6: HTML Export - Full Content Verification

**Objective:** Verify HTML export contains all data with proper formatting

**Steps:**
1. Open the downloaded HTML file in browser (from Test Case 4)
2. Scroll through the entire table and verify content

**Expected Result - Header:**
- ✓ Title: "Reporte Dispositivos: Planta Huachipa DD-MM-YYYY"
- ✓ Subtitle: "Generado el DD/MM/YYYY HH:MM:SS" with current timestamp

**Expected Result - Table Structure:**
- ✓ Column headers: Tipo, Dispositivo, IP, Estado, Respuesta, Actividad, Última Caída, Último Cambio
- ✓ Header has dark background with white text
- ✓ Headers are centered and bold

**Expected Result - Data Rows:**
- ✓ Device type column shows icon + label (not just text)
- ✓ Device names are complete and correct
- ✓ IP addresses in code blocks with gray background
- ✓ Status displays as colored badge:
  - Online: Green badge with "EN LÍNEA"
  - Offline: Red badge with "FUERA DE LÍNEA"
- ✓ Response times show with units (ms) or "N/A"
- ✓ All timestamp fields are properly formatted

**Expected Result - Row Styling:**
- ✓ Alternating row colors for readability
- ✓ Online devices have normal styling
- ✓ Offline devices have red-tinted background
- ✓ Hover effect on rows (subtle background change)

**Expected Result - Footer:**
- ✓ Footer text: "Reporte generado automáticamente por el Sistema de Monitoreo de Dispositivos"

**Verification Checklist:**
- [ ] All columns have data
- [ ] Icons appear in device type column
- [ ] Status badges show correct colors
- [ ] Formatting is consistent throughout
- [ ] Offline device highlighting is visible
- [ ] Footer text is present

---

## Test Case 7: HTML Export - Print Functionality

**Objective:** Verify HTML export can be printed with proper styling

**Steps:**
1. Open the downloaded HTML file in browser
2. Press Ctrl+P (or Cmd+P on Mac) to open print dialog
3. Preview the print layout

**Expected Result:**
- ✓ Print preview shows complete report
- ✓ Header and table are properly formatted
- ✓ No background colors are excessively dark (readable print)
- ✓ Icons are visible in print preview
- ✓ Page breaks are appropriate
- ✓ All content is included

**Verification Checklist:**
- [ ] Print preview shows full report
- [ ] All content is visible in print layout
- [ ] Icons print correctly
- [ ] Text is readable in print preview

---

## Test Case 8: Export with Filtered Data

**Objective:** Verify export only includes filtered/displayed devices

**Steps:**
1. In Monitoring View, apply filters:
   - Search for a specific device name
   - Filter by device type (e.g., only Servers)
   - Filter by status (e.g., only Online)
2. Click "Reporte" button
3. Export to both PDF and HTML
4. Verify exported files contain only filtered devices

**Expected Result:**
- ✓ PDF shows only devices matching current filters
- ✓ HTML shows only devices matching current filters
- ✓ No hidden or filtered devices appear in exports
- ✓ Device count in export matches displayed count

**Verification Checklist:**
- [ ] PDF contains only filtered devices
- [ ] HTML contains only filtered devices
- [ ] Device count matches what's displayed on screen
- [ ] No excluded devices are in the export

---

## Test Case 9: Export with Offline Devices

**Objective:** Verify offline devices display correctly in exports

**Steps:**
1. Ensure you have both online and offline devices visible
2. Export to PDF
3. Export to HTML
4. Verify offline device highlighting

**Expected Result - PDF:**
- ✓ Offline device rows have red/pink background
- ✓ Offline device text has dark red color
- ✓ Status column shows "FUERA DE LÍNEA"

**Expected Result - HTML:**
- ✓ Offline device rows have red-tinted background
- ✓ Device type icons are still visible
- ✓ Status displays red badge with "FUERA DE LÍNEA"

**Verification Checklist:**
- [ ] PDF offline highlighting is visible
- [ ] HTML offline highlighting is visible
- [ ] Status is correctly labeled as "FUERA DE LÍNEA"
- [ ] Icons remain visible for offline devices

---

## Test Case 10: Browser Compatibility

**Objective:** Verify exports work across different browsers

**Prerequisites:**
- Multiple browsers available (Chrome, Firefox, Safari, Edge)

**Steps:**
1. Export HTML file
2. Open the HTML file in different browsers
3. Verify SVG icons display correctly in each

**Expected Result:**
- ✓ SVG icons display in Chrome
- ✓ SVG icons display in Firefox
- ✓ SVG icons display in Safari
- ✓ SVG icons display in Edge
- ✓ Colors are consistent across browsers
- ✓ Formatting is consistent across browsers

**Verification Checklist:**
- [ ] Chrome: Icons display correctly
- [ ] Firefox: Icons display correctly
- [ ] Safari: Icons display correctly
- [ ] Edge: Icons display correctly

---

## Troubleshooting Guide

### Issue: PDF Export Shows Error
**Solution:**
1. Check browser console for specific error messages
2. Ensure you have devices to export
3. Clear browser cache and try again
4. Verify jsPDF library is loaded correctly

### Issue: HTML Icons Don't Display
**Solution:**
1. Ensure JavaScript is enabled in browser
2. Check browser console for errors
3. Verify file is fully downloaded before opening
4. Try opening in different browser

### Issue: PDF Colors Look Wrong
**Solution:**
1. Check PDF viewer settings (might have color mode enabled)
2. Try opening in different PDF reader
3. Check printer settings if printing

### Issue: HTML File Opens as Text
**Solution:**
1. Right-click file → "Open With" → Select web browser
2. Don't open with text editor
3. Verify file extension is .html (not .txt)

---

## Sign-Off Checklist

After completing all test cases, verify:

- [ ] PDF export works without errors
- [ ] PDF displays correct content and formatting
- [ ] HTML export works without errors
- [ ] HTML displays SVG icons with correct colors
- [ ] Both exports work with filtered data
- [ ] Offline devices display correctly
- [ ] Print functionality works for HTML
- [ ] Exports are compatible across browsers
- [ ] All device types display correctly
- [ ] No console errors during any operations

**Date Tested:** ___________
**Tested By:** ___________
**Status:** ✓ PASS / ✗ FAIL
