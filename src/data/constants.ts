export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwszC_NVU_4XAU7XiwtAlSdLBRZWpDHHS-iURDsACZUyD-qhsQlqwPwk6Goa8BgKOP3/exec';

export const PRODUCT_CATEGORIES = [
  { id: 'cup', name: '☕ Ly sứ in hình / Ly đổi màu ma thuật', icon: 'Coffee', desc: 'Ly trắng, ly lòng màu, ly cảm ứng nhiệt' },
  { id: 'keychain', name: '🔑 Móc khóa mica / Móc khóa gỗ khắc laser', icon: 'Key', desc: 'Mica trong 2 mặt, gỗ sồi khắc tên' },
  { id: 'tshirt', name: '👕 Áo thun in ảnh theo yêu cầu / Áo đôi', icon: 'Shirt', desc: 'Cotton 100%, in chuyển nhiệt/DTG cao cấp' },
  { id: 'clock', name: '⏰ Đồng hồ gỗ để bàn / Đồng hồ tráng gương', icon: 'Clock', desc: 'Đồng hồ kim trôi cao cấp in ảnh sắc nét' },
  { id: 'crystal', name: '💎 Khối pha lê 3D / Đế gỗ phát sáng LED', icon: 'Gem', desc: 'Pha lê K9 điêu khắc laser 3D' },
  { id: 'photo', name: '🖼️ In ảnh kỷ niệm / Album / Khung ảnh treo tường', icon: 'Image', desc: 'Ảnh polaroid, ảnh ép gỗ lụa tráng gương' },
  { id: 'sticker', name: '🏷️ Nhãn vở học sinh / Sticker tên chống nước', icon: 'Tag', desc: 'Decal nhựa vinyl cán bóng chống trầy' },
  { id: 'other', name: '✨ Sản phẩm quà tặng khác theo yêu cầu', icon: 'Sparkles', desc: 'Bình giữ nhiệt, tranh ghép, gối in hình...' },
];

export const GAS_CODE_TEMPLATE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - BACKEND XỬ LÝ ĐƠN HÀNG XƯỞNG IN QUÀ TẶNG CÁ NHÂN HÓA
 * Tự động tạo thư mục Drive lưu ảnh gốc + Ghi dữ liệu vào Google Sheets
 * =========================================================================
 */

// ======================= CẤU HÌNH HỆ THỐNG =======================
// 1. Dán ID Thư mục Google Drive cha (Nơi chứa các thư mục đơn hàng của khách)
// Cách lấy ID: Mở thư mục trên Drive, copy đoạn mã cuối URL: https://drive.google.com/drive/folders/[ID_NÀY]
const PARENT_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

// 2. Tên Sheet dùng để lưu đơn hàng (Mặc định là 'Đơn Hàng')
const SHEET_NAME = "Đơn Hàng";
// =================================================================

/**
 * Xử lý yêu cầu POST gửi từ Webapp
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Khóa 30s tránh ghi đè dữ liệu khi có nhiều khách gửi đơn cùng lúc
  try {
    lock.waitLock(30000);
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "Hệ thống đang bận xử lý đơn hàng khác, vui lòng thử lại sau vài giây!"
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
      // Nếu chưa cấu hình ID hoặc không tìm thấy, tạo tại Root Drive
      parentFolder = DriveApp.getRootFolder();
    }

    // Quy tắc đặt tên thư mục: [YYYY-MM-DD_HHmm] TênZalo - SĐT
    const folderName = \`[\${folderDatePrefix}] \${zaloName} - \${phone}\`;
    const orderFolder = parentFolder.createFolder(folderName);
    const folderUrl = orderFolder.getUrl();

    // 4. Giải mã mảng ảnh Base64 và lưu file gốc vào thư mục vừa tạo
    let savedImagesCount = 0;
    if (images.length > 0) {
      images.forEach((imgObj, index) => {
        try {
          let base64Data = "";
          let contentType = "image/jpeg";
          let fileName = \`Anh_in_\${index + 1}.jpg\`;

          if (typeof imgObj === "string") {
            if (imgObj.indexOf(";base64,") !== -1) {
              const parts = imgObj.split(";base64,");
              contentType = parts[0].replace("data:", "");
              base64Data = parts[1];
            } else {
              base64Data = imgObj;
            }
          } else if (typeof imgObj === "object") {
            if (imgObj.name) fileName = \`\${index + 1}_\${imgObj.name}\`;
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

    // Tạo tiêu đề đẹp nếu sheet trống
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

    // Thêm ký tự ' trước SĐT để giữ số 0 đầu
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

    // Trả về JSON thành công
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
    lock.releaseLock();
  }
}

/**
 * Xử lý yêu cầu GET
 */
function doGet(e) {
  return createJsonResponse({
    status: "success",
    message: "Google Apps Script Backend cho Xưởng Quà Tặng đang hoạt động bình thường!",
    timestamp: new Date().toISOString()
  });
}

/**
 * Hàm Output JSON chuẩn CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Chạy test để cấp quyền Drive & Sheets trong lần đầu
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
    Logger.log("=> Đã cấp đủ quyền để triển khai Web App!");
  } catch (e) {
    Logger.log("Lưu ý: " + e.toString());
  }
}`;

export const STANDALONE_HTML_DOWNLOAD_NAME = "index.html";
export const GAS_SCRIPT_DOWNLOAD_NAME = "Code.gs";
