import { test, expect } from "@playwright/test";
import pdf from "pdf-parse-new"; 

test.describe("Invoice PDF Validation Test", () => {

    let fullText: string;
    let numPages: number;
    let numRender: number;
    let pdfInfo: any;
    let pdfMetadata: any;
    let pdfVersion: string;

    test("Download & Validate Invoice PDF", async ({ page }) => {

        await test.step("Load Invoice PDF File from Website", async () => {

            await page.goto("https://www.gimbooks.com/invoice-format");

            const eleDownBtn = page.locator(".button-primary-2.download-now.pdf.w-button");

            const [download] = await Promise.all([
                page.waitForEvent('download'),
                eleDownBtn.click()
            ]);

            const pdfData = await download.createReadStream().then(stream => {
                return new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = [];
                    stream.on("data", chunk => chunks.push(Buffer.from(chunk)));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks)));
                });
            });

            
            const result = await pdf(pdfData);

            fullText = result.text;
            numPages = result.numpages;     
            numRender = result.numrender;   
            pdfInfo = result.info;          
            pdfMetadata = result.metadata;  
            if(result.version !==undefined) pdfVersion = result.version;    
        });

        await test.step("Read Total Number of Pages", async () => {
            await expect(numPages).toBeGreaterThan(0);
            await expect(numPages).toBe(1);
        });

        await test.step("Check Rendered Pages and PDF Metadata", async () => {
            await expect(numRender).toBeGreaterThan(0);
            expect(pdfInfo).toBeDefined();
            expect(pdfMetadata).toBeDefined();
            expect(pdfVersion).toMatch(/\d+\.\d+\.\d+/); 
        });

        await test.step("Extract Full Text from PDF", async () => {
            await expect(fullText.length).toBeGreaterThan(0);
        });

        await test.step("Validate Invoice Number and Invoice Date Format", async () => {
            const inNumReg = /(Invoice Number|Invoice No)[\s:]*[A-Za-z0-9-]+/i;
            const dateRegex = /(Invoice Date|Date)[\s:]*([0-9]{2}[\/-][0-9]{2}[\/-][0-9]{4})/i;

            await expect(fullText.match(inNumReg)).not.toBeNull();
            await expect(fullText.match(dateRegex)).not.toBeNull();
        });
    });
});
