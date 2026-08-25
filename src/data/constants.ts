export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzrMMuUCq4NUHiUFYFdhmHRZD0fFzm8xyx06edYrPoyLFuBFPpwwLY176Su7sRnQkY/exec';

export const PRODUCT_CATEGORIES = [
  { id: 'cup', name: '☕ Ly sứ', icon: 'Coffee', desc: 'Ly sứ trắng, ly lòng màu, ly đổi màu' },
  { id: 'keychain', name: '🔑 Móc khóa', icon: 'Key', desc: 'Móc khóa mica, móc khóa gỗ, kim loại' },
  { id: 'badge', name: '🎖️ Huy hiệu', icon: 'Award', desc: 'Huy hiệu cài áo, pin cài balo, nón' },
  { id: 'clock', name: '⏰ Đồng hồ', icon: 'Clock', desc: 'Đồng hồ để bàn, đồng hồ treo tường tráng gương' },
  { id: 'tshirt', name: '👕 Áo thun', icon: 'Shirt', desc: 'Áo thun in hình theo yêu cầu, áo đôi' },
  { id: 'thermos', name: '🥤 Bình giữ nhiệt', icon: 'CupSoda', desc: 'Bình giữ nhiệt in khắc hình & tên' },
  { id: 'stone_painting', name: '🪨 Tranh đá', icon: 'Image', desc: 'Tranh in trên đá tự nhiên nghệ thuật' },
  { id: 'puzzle', name: '🧩 Tranh ghép', icon: 'Puzzle', desc: 'Tranh xếp hình puzzle kỷ niệm' },
  { id: 'totebag', name: '👜 Túi vải', icon: 'ShoppingBag', desc: 'Túi vải canvas, túi tote in hình' },
  { id: 'crystal', name: '🏆 Kỷ niệm chương / Pha lê', icon: 'Gem', desc: 'Pha lê 3D, cúp lưu niệm' },
  { id: 'album', name: '🖼️ In ảnh kỷ niệm / Album', icon: 'Image', desc: 'In ảnh polaroid, photobook, khung ảnh' },
  { id: 'other', name: '✨ Sản phẩm khác theo yêu cầu', icon: 'Sparkles', desc: 'Gia công in ấn quà tặng theo yêu cầu riêng' },
];

export const GAS_CODE_TEMPLATE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - BACKEND XỬ LÝ ĐƠN HÀNG XƯỞNG IN QUÀ TẶNG DÂU DÂU SHOP
 * Tự động tạo thư mục Drive lưu ảnh gốc + Ghi dữ liệu vào Google Sheets
 * =========================================================================
 */

// ======================= CẤU HÌNH HỆ THỐNG =======================
// 1. ID Thư mục Google Drive cha (Thư mục "Thietke_DauDau")
const PARENT_FOLDER_ID = "1qwnk2OKuxzL8obxFgnlFv6Ef5chkAr-o";

// 2. Tên Sheet dùng để lưu đơn hàng
const SHEET_NAME = "Đơn Hàng";
// =================================================================

/**
 * Xử lý yêu cầu POST gửi từ Webapp đặt in hình
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
    const zaloName = (data.zaloName || "Khách Zalo").trim();
    const phone = (data.phone || "").trim();
    const product = (data.product || "Sản phẩm quà tặng").trim();
    const customRequest = (data.customRequest || data.notes || data.printContent || "").trim();
    const deliveryMethod = (data.deliveryMethod || "shop").trim().toLowerCase();
    const shippingAddress = (data.shippingAddress || "").trim();
    const deadline = (data.deadline || "Không yêu cầu").trim();
    const images = Array.isArray(data.images) ? data.images : [];

    // Phân loại hình thức nhận hàng và gán nhãn thư mục
    const isHomeDelivery = (deliveryMethod === "home" || deliveryMethod === "giao hàng tại nhà" || deliveryMethod === "giaohang");
    const deliveryTag = isHomeDelivery ? "[Giao hàng]" : "[Nhận tại shop]";
    const deliveryMethodText = isHomeDelivery 
      ? ("Giao hàng tận nơi (" + (shippingAddress || "Chưa có địa chỉ") + ")") 
      : "Nhận tại Shop";

    // Làm sạch tên sản phẩm (loại bỏ icon đầu nếu có để đặt tên thư mục gọn gàng)
    const cleanProduct = product.replace(/^[^\w\s\u00C0-\u1EF9]+/u, "").trim() || product;

    // 2. Tạo định dạng thời gian chuẩn: YYYY-MM-DD_HHmm và DD/MM/YYYY HH:mm:ss
    const now = new Date();
    const timeZone = Session.getScriptTimeZone() || "Asia/Ho_Chi_Minh";
    const folderDatePrefix = Utilities.formatDate(now, timeZone, "yyyy-MM-dd_HHmm");
    const displayTimestamp = Utilities.formatDate(now, timeZone, "dd/MM/yyyy HH:mm:ss");

    // 3. Mở thư mục cha Google Drive
    let parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (fErr) {
      // Nếu ID không đúng hoặc chưa phân quyền, tạo tại Root Drive
      parentFolder = DriveApp.getRootFolder();
    }

    // 4. Quy tắc đặt tên thư mục con: [YYYY-MM-DD_HHmm] Tên Zalo [- SĐT] - [Sản phẩm] - [Nhận tại shop / Giao hàng]
    let folderName = "[" + folderDatePrefix + "] " + zaloName;
    if (phone) {
      folderName += " - " + phone;
    }
    folderName += " - [" + cleanProduct + "] - " + deliveryTag;

    const orderFolder = parentFolder.createFolder(folderName);
    const folderUrl = orderFolder.getUrl();

    // 5. Giải mã mảng ảnh Base64 và lưu file ảnh gốc chất lượng cao vào thư mục
    let savedImagesCount = 0;
    if (images.length > 0) {
      images.forEach((imgObj, index) => {
        try {
          let base64Data = "";
          let contentType = "image/jpeg";
          let fileName = "Anh_in_" + (index + 1) + ".jpg";

          if (typeof imgObj === "string") {
            if (imgObj.indexOf(";base64,") !== -1) {
              const parts = imgObj.split(";base64,");
              contentType = parts[0].replace("data:", "");
              base64Data = parts[1];
            } else {
              base64Data = imgObj;
            }
          } else if (typeof imgObj === "object") {
            if (imgObj.name) fileName = (index + 1) + "_" + imgObj.name;
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

    // 6. Ghi dữ liệu vào Google Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Tạo dòng tiêu đề đúng 9 cột của bạn nếu sheet đang trống
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Thời gian",
        "Tên Zalo",
        "SĐT",
        "Sản phẩm",
        "Lời chúc / Ghi chú",
        "Hình thức nhận hàng",
        "Link Drive ảnh",
        "Hạn nhận hàng",
        "Trạng thái"
      ];
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#FF2A5F");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Thêm ký tự ' trước SĐT để Google Sheet giữ nguyên số 0 đầu tiên
    const formattedPhone = phone ? ("'" + phone) : "";
    const defaultStatus = "Mới nhận";

    // Chuẩn bị dòng dữ liệu đúng 9 cột (A -> I):
    // A: Thời gian | B: Tên Zalo | C: SĐT | D: Sản phẩm | E: Lời chúc / Ghi chú | F: Hình thức nhận hàng | G: Link Drive ảnh | H: Hạn nhận hàng | I: Trạng thái
    const rowData = [
      displayTimestamp,     // Cột A: Thời gian
      zaloName,             // Cột B: Tên Zalo
      formattedPhone,       // Cột C: SĐT
      product,              // Cột D: Sản phẩm
      customRequest,        // Cột E: Lời chúc / Ghi chú
      deliveryMethodText,   // Cột F: Hình thức nhận hàng
      folderUrl,            // Cột G: Link Drive ảnh
      deadline,             // Cột H: Hạn nhận hàng
      defaultStatus         // Cột I: Trạng thái
    ];

    sheet.appendRow(rowData);

    // Trả về kết quả JSON thành công
    return createJsonResponse({
      status: "success",
      message: "Đã gửi thông tin đơn hàng thành công!",
      data: {
        zaloName: zaloName,
        phone: phone,
        product: product,
        deliveryMethod: deliveryMethodText,
        folderName: folderName,
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
 * Xử lý yêu cầu GET (kiểm tra trạng thái Web App)
 */
function doGet(e) {
  return createJsonResponse({
    status: "success",
    message: "Google Apps Script Backend cho Xưởng Quà Tặng Dâu Dâu Shop đang hoạt động bình thường!",
    timestamp: new Date().toISOString()
  });
}

/**
 * Hàm Output JSON chuẩn CORS cho trình duyệt
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Hàm chạy kiểm tra cấp quyền Google Drive & Google Sheets lần đầu
 */
function testSetupPermissions() {
  Logger.log("Đang kiểm tra kết nối Google Drive và Sheets...");
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("✅ Kết nối Google Sheet thành công: " + ss.getName());
    
    const folder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    Logger.log("✅ Kết nối Google Drive thành công! Tên thư mục đích: " + folder.getName());
    Logger.log("🎉 ĐÃ CẤP ĐỦ QUYỀN ĐỂ TRIỂN KHAI WEB APP!");
  } catch (e) {
    Logger.log("⚠️ Lỗi kiểm tra: " + e.toString());
  }
}`;

export const STANDALONE_HTML_DOWNLOAD_NAME = "index.html";
export const GAS_SCRIPT_DOWNLOAD_NAME = "Code.gs";
