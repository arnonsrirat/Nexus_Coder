# 🚀 NexusCoder Studio — Release Notes v1.0.16 (System Agent Mode & Host OS Management)

**วันที่อัปเดต:** 24 สิงหาคม 2026  
**เวอร์ชัน:** `1.0.16`  
**สถานะการ Build:** ✅ สำเร็จ (Windows x64 NSIS Installer + Portable Executable)

---

## 🛠️ รายการปรับปรุงและฟีเจอร์ใหม่ใน v1.0.16

### 1. 🖥️ เพิ่มโหมดใหม่: System Agent Mode (โหมดผู้ช่วยตรวจและจัดการเครื่อง)
* **ทำงานอิสระโดยไม่ต้องเปิดโปรเจกต์:** ผู้ใช้สามารถเปิดโปรแกรมและสลับไปที่แท็บโหมด **System** (ไอคอนจอภาพสีส้ม 🖥️) เพื่อเริ่มให้ AI ตรวจสอบและจัดการเครื่องได้ทันที
* **เครื่องมือระบบเฉพาะทาง (Native OS Diagnostic Tools):**
  * `get_system_info`: รายงานสเปกเครื่องแบบละเอียด, สถานะ CPU (Usage %, Cores), RAM total/used/free, พื้นที่ว่างในทุกไดรฟ์ (C:, D: ฯลฯ), IP Address & Network Interfaces, และ Uptime
  * `list_processes`: ดึงรายชื่อ Process ที่รันอยู่ พร้อมการเรียงลำดับตาม RAM หรือ CPU เพื่อหาโปรเซสที่กินทรัพยากรสูง หรือโปรเซสที่ค้าง
  * `kill_process`: คำสั่งสั่งปิด/Terminate Process ที่มีปัญหาตาม PID หรือชื่อแอปพลิเคชัน
  * `get_network_info`: ตรวจสอบ Listening Ports (เช่น 3000, 8080, 5000) และจับคู่ Process ID ที่กำลังเปิดพอร์ต
  * `run_command` & จัดการไฟล์: สั่งรัน PowerShell, CMD, Bash และเข้าถึงไฟล์ทั่วทุกไดรฟ์ของเครื่อง (`C:\`, `D:\`, `%USERPROFILE%`, `%TEMP%`)
* **Persona และ System Prompt เฉพาะ:** กำหนดให้ Agent มีความเชี่ยวชาญด้าน OS Diagnostics, System Admin, DevOps และการแก้ปัญหาเครื่องอย่างปลอดภัย

### 2. 🎨 ปรับปรุง UI และ Chat Experience
* **ModeSelector:** เพิ่มปุ่มสลับโหมด **System** สีอำพัน Amber/Orange
* **Dynamic Quick Prompts & Welcome Screen:** แนะนำคำสั่งตรวจสุขภาพเครื่อง, ตรวจโปรเซส, เช็คพอร์ต และเคลียร์ไฟล์ขยะแคช
* **Chat History Badges:** แสดงป้ายกำกับโหมด `System` ในประวัติการแชต

---

## 📦 ไฟล์ติดตั้งและไบนารีที่พร้อมใช้งาน (Generated Release Artifacts)

| ประเภทไฟล์ | ชื่อไฟล์ | ขนาด | ลิงก์ไฟล์ |
| :--- | :--- | :--- | :--- |
| **Windows Installer** | `NexusCoder Setup 1.0.16.exe` | ~109 MB | [เปิดไฟล์ติดตั้ง](file:///d:/Project/Project_Program/dist-exe/NexusCoder%20Setup%201.0.16.exe) |
| **Portable Executable** | `NexusCoder 1.0.16.exe` | ~108 MB | [เปิดตัวพกพา](file:///d:/Project/Project_Program/dist-exe/NexusCoder%201.0.16.exe) |
| **Unpacked Folder** | `dist-exe/win-unpacked/` | — | [เปิดโฟลเดอร์](file:///d:/Project/Project_Program/dist-exe/win-unpacked) |

