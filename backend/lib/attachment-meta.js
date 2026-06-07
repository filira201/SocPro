const { decodeUploadOriginalName } = require("../controllers/_utils");

function buildUploadAttachmentData(file) {
  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: decodeUploadOriginalName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    kind: file.mimetype.startsWith("image/") ? "image" : "document",
  };
}

/** Документы проекта — всегда kind: document. */
function buildProjectDocumentAttachmentData(file) {
  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: decodeUploadOriginalName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    kind: "document",
  };
}

module.exports = {
  buildUploadAttachmentData,
  buildProjectDocumentAttachmentData,
};
