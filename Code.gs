/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - BACKEND XỬ LÝ ĐƠN HÀNG XƯỞNG IN QUÀ TẶNG CÁ NHÂN HÓA
 * HỖ TRỢ ĐẶT NHIỀU MÓN IN TRONG 1 ĐƠN HÀNG (GIẢI PHÁP 1 + LỰA CHỌN B)
 * - Tự động tạo thư mục Drive chung của đơn + chia thư mục con theo từng món
 * - Tách từng dòng theo từng món trên Google Sheets để dễ theo dõi sản xuất
 * =========================================================================
 */

// ======================= CẤU HÌNH HỆ THỐNG =======================
// 1. Dán ID Thư mục Google Drive cha (Nơi sẽ chứa các thư mục đơn hàng của khách)
// Cách lấy ID: Mở thư mục trên Google Drive, copy đoạn mã ở cuối URL: https://drive.google.com/drive/folders/ĐOẠN_MÃ_ID_NÀY
const PARENT_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

// 2. Tên Sheet dùng để lưu đơn hàng (Mặc định là 'Đơn Hàng' hoặc 'Sheet1')
const SHEET_NAME = "Đơn Hàng";
// =================================================================

/**
 * Xử lý yêu cầu POST gửi từ Webapp
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Khóa tạm thời 30 giây để tránh xung đột khi nhiều khách gửi đơn cùng lúc
  try {
    lock.waitLock(30000);
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "Hệ thống đang bận xử lý đơn hàng khác, vui lòng thử lại sau 10 giây!"
    });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: "error",
        message: "Không tìm thấy dữ liệu gửi lên (Payload trống)!"
      });
    }

    // 1. Đọc và phân tích JSON từ Webapp
    const data = JSON.parse(e.postData.contents);
    const zaloName = (data.zaloName || "Khách Vô Danh").trim();
    const phone = (data.phone || "").trim();
    const deliveryMethod = (data.deliveryMethod || "Nhận hàng tại Shop").trim();
    const shippingAddress = (data.shippingAddress || "").trim();
    const deadline = (data.deadline || "Không yêu cầu").trim();

    // Kiểm tra dữ liệu bắt buộc
    if (!zaloName) {
      return createJsonResponse({
        status: "error",
        message: "Vui lòng cung cấp Tên Nick Zalo hợp lệ!"
      });
    }

    // 2. Chuẩn hóa danh sách các món in (hỗ trợ cả dạng mới `items` và dạng cũ `product/images`)
    let itemsList = [];
    if (Array.isArray(data.items) && data.items.length > 0) {
      itemsList = data.items.map((it, idx) => ({
        index: idx + 1,
        product: (it.product || "Khác").trim(),
        quantity: Number(it.quantity) || 1,
        customRequest: (it.customRequest || "").trim(),
        images: Array.isArray(it.images) ? it.images : []
      }));
    } else {
      // Dạng cũ (1 sản phẩm duy nhất)
      itemsList = [{
        index: 1,
        product: (data.product || "Khác").trim(),
        quantity: 1,
        customRequest: (data.customRequest || data.printContent || data.notes || "").trim(),
        images: Array.isArray(data.images) ? data.images : []
      }];
    }

    // Tạo chuỗi tóm tắt sản phẩm (VD: 2x Ly sứ, 3x Móc khóa)
    const productSummary = itemsList
      .map(it => (it.quantity > 1 ? it.quantity + "x " : "") + it.product)
      .join(", ");

    // 3. Định dạng thời gian
    const now = new Date();
    const timeZone = Session.getScriptTimeZone() || "Asia/Ho_Chi_Minh";
    const folderDatePrefix = Utilities.formatDate(now, timeZone, "yyyy-MM-dd_HHmm");
    const displayTimestamp = Utilities.formatDate(now, timeZone, "dd/MM/yyyy HH:mm:ss");

    // 4. Tạo thư mục đơn hàng chính trên Google Drive
    let parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (fErr) {
      parentFolder = DriveApp.getRootFolder();
    }

    // Tên thư mục đơn: [YYYY-MM-DD_HHmm] [Tên Zalo] - [SĐT] - [Sản phẩm] - [Hình thức nhận]
    const cleanPhoneForFolder = phone ? ` - ${phone}` : "";
    const cleanDeliveryShort = deliveryMethod === "Giao hàng tại nhà" ? "Giao tận nơi" : "Nhận tại Shop";
    const mainFolderName = `[${folderDatePrefix}] ${zaloName}${cleanPhoneForFolder} - [${productSummary}] - [${cleanDeliveryShort}]`;
    const orderFolder = parentFolder.createFolder(mainFolderName);
    const mainFolderUrl = orderFolder.getUrl();

    // 5. Lưu ảnh cho từng món vào Drive (tạo thư mục con nếu có nhiều món)
    let totalSavedImagesCount = 0;
    const isMultipleItems = itemsList.length > 1;

    itemsList.forEach((item, itemIdx) => {
      let targetFolder = orderFolder;

      // Nếu có từ 2 món trở lên, tạo thư mục con riêng cho từng món
      if (isMultipleItems) {
        const sanitizedProdName = item.product
          .replace(/[\\/:*?"<>|]/g, "")
          .replace(/\s+/g, "_")
          .substring(0, 30);
        const subFolderName = `Mon_${itemIdx + 1}_${sanitizedProdName}_x${item.quantity}`;
        try {
          targetFolder = orderFolder.createFolder(subFolderName);
        } catch (subErr) {
          targetFolder = orderFolder;
        }
      }

      item.folderUrl = targetFolder.getUrl();
      let itemSavedCount = 0;

      if (item.images && item.images.length > 0) {
        item.images.forEach((imgObj, imgIdx) => {
          try {
            let base64Data = "";
            let contentType = "image/jpeg";
            let fileName = `Mon_${itemIdx + 1}_Anh_${imgIdx + 1}.jpg`;

            if (typeof imgObj === "string") {
              if (imgObj.indexOf(";base64,") !== -1) {
                const parts = imgObj.split(";base64,");
                contentType = parts[0].replace("data:", "");
                base64Data = parts[1];
              } else {
                base64Data = imgObj;
              }
            } else if (typeof imgObj === "object") {
              if (imgObj.name) fileName = `Mon_${itemIdx + 1}_${imgIdx + 1}_${imgObj.name}`;
              if (imgObj.type) contentType = imgObj.type;
              
              const rawBase64 = imgObj.base64 || imgObj.data || "";
              if (rawBase64.indexOf(";base64,") !== -1) {
                base64Data = rawBase64.split(";base64,")[1];
              } else {
                base64Data = rawBase64;
              }
            }

            if (base64Data) {
              const decodedBlob = Utilities.newBlob(
                Utilities.base64Decode(base64Data),
                contentType,
                fileName
              );
              targetFolder.createFile(decodedBlob);
              itemSavedCount++;
              totalSavedImagesCount++;
            }
          } catch (imgErr) {
            Logger.log(`Lỗi lưu ảnh món ${itemIdx + 1}, ảnh ${imgIdx + 1}: ${imgErr.toString()}`);
          }
        });
      }

      item.savedImagesCount = itemSavedCount;
    });

    // 6. Ghi dữ liệu vào Google Sheet (LỰA CHỌN B: TÁCH TỪNG DÒNG THEO MÓN)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Tạo hàng tiêu đề chuẩn 10 cột nếu Sheet mới
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Thời Gian Gửi",             // Cột A
        "Tên Zalo Khách",            // Cột B
        "Số Điện Thoại",             // Cột C
        "Sản Phẩm & Số Lượng",       // Cột D
        "Nội Dung In / Lời Chúc",    // Cột E
        "Hình Thức Nhận Hàng",       // Cột F
        "Link Ảnh Drive",            // Cột G
        "Hạn Nhận Hàng",             // Cột H
        "Trạng Thái",                // Cột I
        "Đếm Hạn"                    // Cột J
      ];
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#d10074");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Chuẩn bị thông tin nhận hàng
    const formattedPhone = phone ? "'" + phone : "Nhận tại Shop";
    let deliverySheetText = deliveryMethod;
    if (deliveryMethod === "Giao hàng tại nhà") {
      deliverySheetText = `Giao tận nơi: ${shippingAddress || "Chưa có địa chỉ"}`;
    } else {
      deliverySheetText = "Nhận tại Shop";
    }

    // Ghi từng món thành từng dòng trên Sheet
    itemsList.forEach((item) => {
      const startRow = getFirstEmptyRowInColA(sheet);
      const productText = (item.quantity > 1 ? `${item.quantity}x ` : "") + item.product;
      const customText = item.customRequest || "In theo ảnh gửi";
      const itemDriveUrl = item.folderUrl || mainFolderUrl;
      const statusText = "Mới nhận";

      const rowValues = [
        displayTimestamp,         // A: Thời Gian Gửi
        zaloName,                 // B: Tên Zalo
        formattedPhone,           // C: SĐT
        productText,              // D: Sản Phẩm & SL
        customText,               // E: Lời chúc & Yêu cầu in riêng
        deliverySheetText,        // F: Hình thức nhận hàng
        itemDriveUrl,             // G: Link Drive
        deadline,                 // H: Hạn Nhận
        statusText                // I: Trạng Thái
      ];

      // Ghi từ cột A đến I
      sheet.getRange(startRow, 1, 1, rowValues.length).setValues([rowValues]);

      // Ghi công thức Đếm Hạn tại Cột J
      try {
        const formulaCell = sheet.getRange(startRow, 10);
        formulaCell.setFormula(`=IF(H${startRow}="", "", H${startRow} - TODAY())`);
        formulaCell.setNumberFormat("0");
        formulaCell.setHorizontalAlignment("center");
      } catch (fErr) {
        Logger.log("Lỗi ghi công thức cột J: " + fErr.toString());
      }
    });

    // 7. Trả kết quả thành công cho Webapp
    return createJsonResponse({
      status: "success",
      message: `Đã gửi thành công ${itemsList.length} món in! Shop sẽ liên hệ gửi bản demo qua Zalo sớm nhất.`,
      data: {
        zaloName: zaloName,
        phone: phone,
        product: productSummary,
        deliveryMethod: deliveryMethod,
        shippingAddress: shippingAddress,
        folderUrl: mainFolderUrl,
        savedImages: totalSavedImagesCount,
        timestamp: displayTimestamp,
        items: itemsList.map(it => ({
          product: it.product,
          quantity: it.quantity,
          customRequest: it.customRequest,
          imagesCount: it.savedImagesCount
        }))
      }
    });

  } catch (error) {
    Logger.log("LỖI HỆ THỐNG: " + error.toString());
    return createJsonResponse({
      status: "error",
      message: "Lỗi xử lý máy chủ: " + error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Tìm dòng trống kế tiếp trong Cột A để ghi dữ liệu liên tiếp chính xác
 */
function getFirstEmptyRowInColA(sheet) {
  const colAValues = sheet.getRange("A1:A" + Math.max(sheet.getMaxRows(), 100)).getValues();
  for (let i = 0; i < colAValues.length; i++) {
    if (!colAValues[i][0] || colAValues[i][0].toString().trim() === "") {
      return i + 1;
    }
  }
  return sheet.getLastRow() + 1;
}

/**
 * Xử lý yêu cầu GET (kiểm tra trạng thái)
 */
function doGet(e) {
  return createJsonResponse({
    status: "success",
    message: "Google Apps Script Backend cho Xưởng Quà Tặng (Đa sản phẩm) đang hoạt động bình thường!",
    timestamp: new Date().toISOString()
  });
}

/**
 * Hàm hỗ trợ tạo Output JSON chuẩn CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Hàm Chạy Thử Nghiệm để cấp quyền và kiểm tra kết nối Google Sheet + Drive
 */
function testSetupPermissions() {
  Logger.log("Đang kiểm tra kết nối Google Drive và Sheets...");
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("Kết nối Google Sheet thành công: " + ss.getName());
    
    let folderName = "Root Drive";
    if (PARENT_FOLDER_ID && PARENT_FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE") {
      const folder = DriveApp.getFolderById(PARENT_FOLDER_ID);
      folderName = folder.getName();
    }
    Logger.log("Kết nối Google Drive thành công! Thư mục đích: " + folderName);
    Logger.log("=> Tất cả quyền đã sẵn sàng!");
  } catch (e) {
    Logger.log("Lưu ý: " + e.toString());
  }
}
