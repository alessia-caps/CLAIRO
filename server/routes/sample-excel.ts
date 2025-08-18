import { RequestHandler } from "express";

export const generateSampleExcel: RequestHandler = async (req, res) => {
  try {
    // URL of the uploaded bneXt_Sample_Data file
    const fileUrl =
      "https://cdn.builder.io/o/assets%2F6998cdc1e6454214abcf75bd6d5f5e00%2F8cba862a011f4b3fb6add381e1a0a3dd?alt=media&token=02904aac-7f46-4350-9d16-1a34394204d5&apiKey=6998cdc1e6454214abcf75bd6d5f5e00";

    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      // Fetch the file from the CDN with timeout
      const response = await fetch(fileUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "bneXt-App/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      // Get the file as a buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Set headers for file download
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="bneXt_Sample_Data.xlsx"',
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Length", buffer.length);

      // Send the buffer
      res.send(buffer);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error downloading sample Excel file:", error);

    // Provide more specific error messages
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timeout - the file download took too long";
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({
      error: "Failed to download sample Excel file",
      message: errorMessage,
    });
  }
};
