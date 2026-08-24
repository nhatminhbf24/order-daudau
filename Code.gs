/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - BACKEND XỬ LÝ ĐƠN HÀNG XƯỞNG IN QUÀ TẶNG CÁ NHÂN HÓA
 * Tự động tạo thư mục Drive lưu ảnh gốc + Ghi dữ liệu vào Google Sheets
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
  // Khóa tạm thời 30 giây để tránh xung đột khi có nhiều khách gửi cùng lúc
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
    const product = (data.product || "Khác").trim();
    const printContent = (data.printContent || "").trim();
    const deadline = (data.deadline || "Không yêu cầu").trim();
    const notes = (data.notes || "").trim();
    const images = Array.isArray(data.images) ? data.images : [];

    // Kiểm tra dữ liệu bắt buộc
    if (!zaloName || !phone) {
      return createJsonResponse({
        status: "error",
        message: "Vui lòng cung cấp Tên Zalo và Số điện thoại hợp lệ!"
      });
    }

    // 2. Tạo định dạng thời gian chuẩn: YYYY-MM-DD_HHmm và DD/MM/YYYY HH:mm:ss
    const now = new Date();
    const timeZone = Session.getScriptTimeZone() || "Asia/Ho_Chi_Minh";
    const folderDatePrefix = Utilities.formatDate(now, timeZone, "yyyy-MM-dd_HHmm");
    const displayTimestamp = Utilities.formatDate(now, timeZone, "dd/MM/yyyy HH:mm:ss");

    // 3. Tạo thư mục con trên Google Drive
    let parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (fErr) {
      // Nếu chưa cấu hình ID hoặc không tìm thấy, tạo tại Root Drive để tránh mất dữ liệu
      parentFolder = DriveApp.getRootFolder();
    }

    // Quy tắc đặt tên thư mục: [YYYY-MM-DD_HHmm] TênZalo - SĐT
    const folderName = `[${folderDatePrefix}] ${zaloName} - ${phone}`;
    const orderFolder = parentFolder.createFolder(folderName);
    const folderUrl = orderFolder.getUrl();

    // 4. Giải mã mảng ảnh Base64 và lưu file gốc vào thư mục vừa tạo
    let savedImagesCount = 0;
    if (images.length > 0) {
      images.forEach((imgObj, index) => {
        try {
          let base64Data = "";
          let contentType = "image/jpeg";
          let fileName = `Anh_in_${index + 1}.jpg`;

          if (typeof imgObj === "string") {
            // Trường hợp là chuỗi Data URL: data:image/png;base64,xxxx
            if (imgObj.indexOf(";base64,") !== -1) {
              const parts = imgObj.split(";base64,");
              contentType = parts[0].replace("data:", "");
              base64Data = parts[1];
            } else {
              base64Data = imgObj;
            }
          } else if (typeof imgObj === "object") {
            // Trường hợp object: { name, type, base64 }
            if (imgObj.name) fileName = `${index + 1}_${imgObj.name}`;
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
            orderFolder.createFile(decodedBlob);
            savedImagesCount++;
          }
        } catch (imgErr) {
          Logger.log("Lỗi lưu ảnh thứ " + (index + 1) + ": " + imgErr.toString());
        }
      });
    }

    // 5. Ghi dữ liệu vào Google Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Nếu Sheet chưa có tiêu đề, tạo hàng tiêu đề chuyên nghiệp
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Thời Gian Gửi",
        "Tên Zalo Khách",
        "Số Điện Thoại",
        "Loại Sản Phẩm",
        "Nội Dung Cần In",
        "Hạn Nhận Hàng",
        "Ghi Chú & Thiết Kế",
        "Link Ảnh Drive",
        "Số Lượng Ảnh",
        "Trạng Thái"
      ];
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#2563EB");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Thêm ký tự ' trước SĐT để Google Sheet hiểu là chuỗi Text, không làm mất số 0 đầu
    const formattedPhone = "'" + phone;
    const defaultStatus = "Chờ xử lý";

    const rowData = [
      displayTimestamp,
      zaloName,
      formattedPhone,
      product,
      printContent,
      deadline,
      notes,
      folderUrl,
      savedImagesCount,
      defaultStatus
    ];

    sheet.appendRow(rowData);

    // Trả về kết quả thành công cho Webapp
    return createJsonResponse({
      status: "success",
      message: "Đã gửi thông tin đơn hàng thành công! Shop sẽ liên hệ gửi bản demo qua Zalo sớm nhất.",
      data: {
        zaloName: zaloName,
        phone: phone,
        product: product,
        folderUrl: folderUrl,
        savedImages: savedImagesCount,
        timestamp: displayTimestamp
      }
    });

  } catch (error) {
    Logger.log("LỖI HỆ THỐNG: " + error.toString());
    return createJsonResponse({
      status: "error",
      message: "Lỗi xử lý máy chủ: " + error.toString()
    });
  } finally {
    // Giải phóng khóa
    lock.releaseLock();
  }
}

/**
 * Xử lý yêu cầu GET (dùng để kiểm tra trạng thái hoạt động của Script)
 */
function doGet(e) {
  return createJsonResponse({
    status: "success",
    message: "Google Apps Script Backend cho Xưởng Quà Tặng đang hoạt động bình thường!",
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
 * (Chạy hàm này 1 lần trong Apps Script Editor để bấm Duyệt Quyền - Allow Permissions)
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
    Logger.log("=> Tất cả quyền đã sẵn sàng để triển khai Web App!");
  } catch (e) {
    Logger.log("Lưu ý: " + e.toString());
  }
}
