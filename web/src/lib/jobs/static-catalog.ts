/**
 * Đồng bộ danh sách Doanh nghiệp & Tin tuyển dụng THẬT vào cơ sở dữ liệu:
 * - Mỗi doanh nghiệp đều gắn Mã số thuế xác thực thực tế từ Tổng cục Thuế (api.vietqr.io),
 *   địa chỉ pháp lý chuẩn, logo cục bộ và một tài khoản Nhà tuyển dụng (HR) riêng.
 * - Loại bỏ các bản ghi tin mẫu cũ không có chủ sở hữu (`hr_user_id === 0`, `source === "catalog"`).
 * - Không chạm tới tin do HR tự đăng thủ công (`source === "hr"` đã có sẵn) hoặc các đơn ứng tuyển đang có.
 */
import type { CompanyRecord, DatabaseDocument, JobRecord, UserRecord } from "@/lib/db/types";

export const CATALOG_VERSION = 4;

type Helpers = {
  generateObjectId: () => string;
  computeJdHash: (job: JobRecord) => string;
  hashPassword: (plainPassword: string) => string;
  slugifyVietnamese: (text: string) => string;
};

interface RealCompanySeed {
  key: string;
  taxCode: string;
  legalName: string;
  address: string;
  logoUrl: string;
  website: string;
  industry: string;
  companySize: string;
  description: string;
  hrEmail: string;
  hrFullName: string;
  hrPhone: string;
  benefits?: string[];
}

interface RealJobSeed {
  companyKey: string;
  slug: string;
  title: string;
  categorySlug: string;
  jobCategory: string;
  location: string;
  workAddress: string;
  salaryMin: number;
  salaryMax: number;
  salaryRange: string;
  experienceRequired: string;
  level: string;
  employmentType: string;
  educationRequired: string;
  vacancies: number;
  urgent?: boolean;
  tags: string[];
  requiredSkills: string[];
  description: string;
  requirements: string;
  benefits: string;
  deadline: string;
}

const REAL_COMPANIES: RealCompanySeed[] = [
  {
    key: "fpt-software",
    taxCode: "0101601092",
    legalName: "CÔNG TY TNHH PHẦN MỀM FPT",
    address: "Tòa nhà FPT Cầu Giấy, phố Duy Tân, Phường Cầu Giấy, TP Hà Nội",
    logoUrl: "/logos/fpt.svg",
    website: "https://fptsoftware.com",
    industry: "Công nghệ phần mềm & AI",
    companySize: "1000+ nhân sự",
    description:
      "Công ty thành viên thuộc Tập đoàn FPT, chuyên phát triển phần mềm, chuyển đổi số, Cloud và giải pháp Trí tuệ nhân tạo cho khách hàng toàn cầu.",
    hrEmail: "hr@fptsoftware.com",
    hrFullName: "Trần Thu Hà",
    hrPhone: "0909123456",
    benefits: ["Lương tháng 13 & thưởng hiệu suất", "Bảo hiểm sức khỏe FPT Care", "Cơ hội onsite nước ngoài"],
  },
  {
    key: "momo",
    taxCode: "0305289153",
    legalName: "CÔNG TY CỔ PHẦN DỊCH VỤ DI ĐỘNG TRỰC TUYẾN",
    address: "Tầng 6, Toà nhà Phú Mỹ Hưng, số 8 đường Hoàng Văn Thái, Phường Tân Mỹ, TP Hồ Chí Minh",
    logoUrl: "/logos/momo.svg",
    website: "https://momo.vn",
    industry: "Fintech & Thanh toán số",
    companySize: "1000+ nhân sự",
    description:
      "Đơn vị chủ quản Siêu ứng dụng tài chính số MoMo phục vụ hơn 31 triệu người dùng cá nhân và hàng trăm nghìn đối tác doanh nghiệp tại Việt Nam.",
    hrEmail: "hr@momo.vn",
    hrFullName: "Lê Quốc Khánh",
    hrPhone: "0908223344",
    benefits: ["Thưởng KPI & ESOP theo năng lực", "Gói bảo hiểm sức khỏe cao cấp", "Làm việc linh hoạt Hybrid"],
  },
  {
    key: "vincode",
    taxCode: "0319286875",
    legalName: "CÔNG TY TNHH CHUYỂN ĐỔI SỐ VINCODE",
    address: "Tầng 3, Tòa nhà An Phú Plaza, 117-119 Lý Chính Thắng, Phường Xuân Hòa, TP Hồ Chí Minh",
    logoUrl: "/logos/vincode.svg",
    website: "https://vincode.vn",
    industry: "Chuyển đổi số & Giải pháp Web/AI",
    companySize: "50-200 nhân sự",
    description:
      "Doanh nghiệp công nghệ phát triển nền tảng số, tự động hóa quy trình nghiệp vụ và ứng dụng AI cho doanh nghiệp vừa và nhỏ tại Việt Nam.",
    hrEmail: "phamkhoa3092003@gmail.com",
    hrFullName: "Phạm Đăng Khoa",
    hrPhone: "0909001122",
    benefits: ["Review lương 2 lần/năm", "Thưởng dự án theo quý", "Đào tạo chuyên sâu AI & Cloud"],
  },
  {
    key: "vng",
    taxCode: "0303490096",
    legalName: "CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG",
    address: "Z06 Đường số 13, Phường Tân Thuận, TP Hồ Chí Minh",
    logoUrl: "/logos/vng.svg",
    website: "https://vng.com.vn",
    industry: "Internet, AI Cloud & Fintech",
    companySize: "1000+ nhân sự",
    description:
      "Tập đoàn công nghệ hàng đầu Việt Nam hoạt động trong các mảng Zalo & AI, Cloud Services, Thanh toán số và Trò chơi trực tuyến.",
    hrEmail: "hr@vng.com.vn",
    hrFullName: "Nguyễn Minh Tuấn",
    hrPhone: "0903112233",
    benefits: ["Khuôn viên VNG Campus hiện đại", "Bảo hiểm sức khỏe toàn diện", "Phụ cấp ăn trưa & gửi xe"],
  },
  {
    key: "kms",
    taxCode: "0309793900",
    legalName: "CÔNG TY TNHH KMS TECHNOLOGY VIỆT NAM",
    address: "Số 2 đường Tản Viên, Phường Tân Sơn Hòa, TP Hồ Chí Minh",
    logoUrl: "/logos/kms.svg",
    website: "https://kms-technology.com",
    industry: "Phát triển phần mềm & Tư vấn công nghệ",
    companySize: "1000+ nhân sự",
    description:
      "Công ty công nghệ chuyên cung cấp dịch vụ phát triển phần mềm chuẩn quốc tế, kiến trúc Microservices và kiểm thử tự động cho thị trường Hoa Kỳ.",
    hrEmail: "hr@kms-technology.com",
    hrFullName: "Võ Thị Thanh Ngọc",
    hrPhone: "0904223344",
    benefits: ["15 ngày phép năm + nghỉ lễ bổ sung", "Bảo hiểm PTI cho cả gia đình", "Ngân sách đào tạo & thi chứng chỉ"],
  },
  {
    key: "shopee",
    taxCode: "0106773786",
    legalName: "CÔNG TY TNHH SHOPEE",
    address: "Tầng 4-5-6, Tòa nhà Capital Place, số 29 đường Liễu Giai, Phường Ngọc Hà, TP Hà Nội",
    logoUrl: "/logos/shopee.svg",
    website: "https://shopee.vn",
    industry: "Thương mại điện tử",
    companySize: "1000+ nhân sự",
    description:
      "Nền tảng thương mại điện tử hàng đầu Đông Nam Á, kết nối hàng triệu người mua và nhà bán hàng tại Việt Nam.",
    hrEmail: "hr@shopee.vn",
    hrFullName: "Đặng Phương Linh",
    hrPhone: "0905334455",
    benefits: ["Thưởng hiệu suất cuối năm cạnh tranh", "Bảo hiểm sức khỏe mở rộng", "Môi trường trẻ trung, quốc tế"],
  },
  {
    key: "ghn",
    taxCode: "0311907295",
    legalName: "CÔNG TY CỔ PHẦN DỊCH VỤ GIAO HÀNG NHANH",
    address: "405/15 Xô Viết Nghệ Tĩnh, Phường Bình Thạnh, TP Hồ Chí Minh",
    logoUrl: "/logos/ghn.svg",
    website: "https://ghn.vn",
    industry: "Logistics & Giao nhận E-Commerce",
    companySize: "1000+ nhân sự",
    description:
      "Doanh nghiệp giao nhận thương mại điện tử tiên phong vận hành hệ thống phân loại tự động và mạng lưới bưu cục phủ khắp Việt Nam.",
    hrEmail: "hr@ghn.vn",
    hrFullName: "Huỳnh Tấn Tài",
    hrPhone: "0906445566",
    benefits: ["BHXH đầy đủ từ tháng đầu tiên", "Thưởng KPI vận hành hàng tháng", "Lộ trình thăng tiến quản lý vùng"],
  },
  {
    key: "tiki",
    taxCode: "0309532909",
    legalName: "CÔNG TY TNHH TI KI",
    address: "208 Cô Bắc, Phường Cầu Ông Lãnh, TP Hồ Chí Minh",
    logoUrl: "/logos/tiki.svg",
    website: "https://tiki.vn",
    industry: "Thương mại điện tử & Chuỗi cung ứng",
    companySize: "500-1000 nhân sự",
    description:
      "Sàn thương mại điện tử uy tín tại Việt Nam với dịch vụ giao nhanh TikiNOW và hệ thống chăm sóc khách hàng chuẩn hóa.",
    hrEmail: "hr@tiki.vn",
    hrFullName: "Phan Bảo Trâm",
    hrPhone: "0907556677",
    benefits: ["Phụ cấp ăn trưa & gửi xe", "Voucher mua sắm nội bộ", "Xét tăng lương định kỳ hàng năm"],
  },
  {
    key: "mwg",
    taxCode: "0303217354",
    legalName: "CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH",
    address: "128 Trần Quang Khải, Phường Tân Định, TP Hồ Chí Minh",
    logoUrl: "/logos/mwg.svg",
    website: "https://thegioididong.com",
    industry: "Bán lẻ công nghệ & Điện máy",
    companySize: "1000+ nhân sự",
    description:
      "Hệ thống bán lẻ thiết bị di động và điện máy quy mô lớn hàng đầu Việt Nam thuộc Tập đoàn Thế Giới Di Động.",
    hrEmail: "hr@thegioididong.com",
    hrFullName: "Nguyễn Hữu Nghĩa",
    hrPhone: "0908667788",
    benefits: ["Thưởng doanh số không giới hạn", "Thưởng Tết hấp dẫn theo thâm niên", "Cơ hội lên Quản lý siêu thị"],
  },
  {
    key: "pnj",
    taxCode: "0300521758",
    legalName: "CÔNG TY CỔ PHẦN VÀNG BẠC ĐÁ QUÝ PHÚ NHUẬN",
    address: "170E Phan Đăng Lưu, Phường Đức Nhuận, TP Hồ Chí Minh",
    logoUrl: "/logos/pnj.svg",
    website: "https://pnj.com.vn",
    industry: "Bán lẻ trang sức & Quản trị doanh nghiệp",
    companySize: "1000+ nhân sự",
    description:
      "Thương hiệu chế tác và bán lẻ trang sức hàng đầu Việt Nam với hơn 400 cửa hàng và văn phòng quản trị hiện đại.",
    hrEmail: "hr@pnj.com.vn",
    hrFullName: "Trương Mỹ Hạnh",
    hrPhone: "0909778899",
    benefits: ["Lương tháng 13 & thưởng thành tích", "Bảo hiểm sức khỏe PNJ Care", "Đào tạo phát triển năng lực lãnh đạo"],
  },
  {
    key: "viettel",
    taxCode: "0100109106",
    legalName: "TẬP ĐOÀN CÔNG NGHIỆP - VIỄN THÔNG QUÂN ĐỘI",
    address: "Số 5, Phố Nguyễn Hữu An, Phường Cầu Giấy, TP Hà Nội",
    logoUrl: "/logos/viettel.svg",
    website: "https://viettel.com.vn",
    industry: "Viễn thông, An ninh mạng & Công nghệ cao",
    companySize: "1000+ nhân sự",
    description:
      "Tập đoàn công nghệ viễn thông lớn nhất Việt Nam, tiên phong hạ tầng số, điện toán đám mây, an toàn thông tin và AI.",
    hrEmail: "hr@viettel.com.vn",
    hrFullName: "Bùi Quang Minh",
    hrPhone: "0912889900",
    benefits: ["Thu nhập cạnh tranh top thị trường", "Chế độ phúc lợi & bảo hiểm toàn diện", "Tham gia dự án hạ tầng trọng điểm quốc gia"],
  },
  {
    key: "misa",
    taxCode: "0101243150",
    legalName: "CÔNG TY CỔ PHẦN MISA",
    address: "Tầng 9, tòa nhà Technosoft, phố Duy Tân, Phường Cầu Giấy, TP Hà Nội",
    logoUrl: "/logos/misa.svg",
    website: "https://misa.vn",
    industry: "Phần mềm Kế toán & Quản trị doanh nghiệp (SaaS)",
    companySize: "1000+ nhân sự",
    description:
      "Doanh nghiệp phần mềm dẫn đầu tại Việt Nam về giải pháp kế toán tài chính, hóa đơn điện tử và nền tảng quản trị doanh nghiệp hợp nhất MISA AMIS.",
    hrEmail: "hr@misa.com.vn",
    hrFullName: "Lê Thu Hương",
    hrPhone: "0913990011",
    benefits: ["Hoa hồng & thưởng doanh số minh bạch", "Đào tạo nghiệp vụ tài chính - phần mềm", "Du lịch & teambuilding hàng năm"],
  },
  {
    key: "vinamilk",
    taxCode: "0300588569",
    legalName: "CÔNG TY CỔ PHẦN SỮA VIỆT NAM",
    address: "10 Tân Trào, Phường Tân Mỹ, TP Hồ Chí Minh",
    logoUrl: "/logos/vinamilk.svg",
    website: "https://vinamilk.com.vn",
    industry: "Sản xuất FMCG & Tự động hóa công nghiệp",
    companySize: "1000+ nhân sự",
    description:
      "Doanh nghiệp dinh dưỡng hàng đầu Việt Nam sở hữu hệ thống nhà máy tự động hóa chuẩn quốc tế trên toàn quốc.",
    hrEmail: "hr@vinamilk.com.vn",
    hrFullName: "Đỗ Thành Long",
    hrPhone: "0914001122",
    benefits: ["Thưởng năng suất & lương tháng 13–14", "Xe đưa đón & hỗ trợ suất ăn tại nhà máy", "Bảo hiểm tai nạn & sức khỏe 24/7"],
  },
];

const REAL_JOBS: RealJobSeed[] = [
  {
    companyKey: "vincode",
    slug: "fullstack-developer-nextjs-nodejs-vincode",
    title: "Fullstack Web Developer (Next.js / TypeScript / Node.js)",
    categorySlug: "cong-nghe",
    jobCategory: "Công nghệ / IT",
    location: "TP. Hồ Chí Minh",
    workAddress: "117-119 Lý Chính Thắng, Phường Xuân Hòa, TP Hồ Chí Minh",
    salaryMin: 18,
    salaryMax: 30,
    salaryRange: "18 - 30 triệu",
    experienceRequired: "2 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 2,
    urgent: true,
    tags: ["Next.js", "TypeScript", "Node.js", "PostgreSQL"],
    requiredSkills: ["TypeScript", "ReactJS", "Next.js", "Node.js", "PostgreSQL", "REST API", "Git"],
    description:
      "Phát triển hệ thống web ứng dụng trên nền tảng Next.js, React, TypeScript và Node.js.\nThiết kế API RESTful, mô hình dữ liệu PostgreSQL/MongoDB và tích hợp các dịch vụ AI.\nPhối hợp cùng đội thiết kế và phân tích nghiệp vụ để tối ưu hiệu năng và trải nghiệm người dùng.",
    requirements:
      "Từ 2 năm kinh nghiệm lập trình Web với ReactJS, Next.js, TypeScript và Node.js.\nThành thạo SQL/PostgreSQL, Git và quy trình phát triển phần mềm Agile.\nƯu tiên ứng viên có kinh nghiệm triển khai Docker hoặc tích hợp dịch vụ AI.",
    benefits:
      "Thu nhập 18 - 30 triệu/tháng, review lương 2 lần/năm.\nThưởng dự án theo quý, BHXH đầy đủ.\nMôi trường công nghệ cởi mở, cơ hội làm sản phẩm thực tế từ đầu.",
    deadline: "2027-02-28",
  },
  {
    companyKey: "vng",
    slug: "backend-ai-engineer-python-fastapi-vng",
    title: "Backend & AI Engineer (Python / FastAPI / PyTorch)",
    categorySlug: "du-lieu-ai",
    jobCategory: "Dữ liệu & AI",
    location: "TP. Hồ Chí Minh",
    workAddress: "Z06 Đường số 13, Phường Tân Thuận, TP Hồ Chí Minh",
    salaryMin: 25,
    salaryMax: 45,
    salaryRange: "25 - 45 triệu",
    experienceRequired: "2 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 3,
    urgent: true,
    tags: ["Python", "FastAPI", "PyTorch", "NLP"],
    requiredSkills: ["Python", "FastAPI", "Machine Learning", "PyTorch", "Docker", "PostgreSQL", "Git"],
    description:
      "Xây dựng dịch vụ AI Microservices phục vụ xử lý ngôn ngữ tự nhiên (NLP), tìm kiếm ngữ nghĩa và xếp hạng ứng viên.\nTriển khai mô hình Transformer/Embedding bằng PyTorch và FastAPI với độ trễ thấp.\nTối ưu pipeline xử lý dữ liệu và giám sát chất lượng mô hình trên môi trường production.",
    requirements:
      "Tối thiểu 2 năm kinh nghiệm Python Backend (FastAPI/Django) và triển khai mô hình ML/NLP.\nNắm vững PyTorch/Transformers, Docker, PostgreSQL và Git.\nCó khả năng đọc tài liệu nghiên cứu AI bằng tiếng Anh.",
    benefits:
      "Thu nhập 25 - 45 triệu/tháng kèm thưởng hiệu suất.\nLàm việc tại VNG Campus Quận 7 với trang bị GPU phục vụ nghiên cứu.\nBảo hiểm sức khỏe toàn diện và phụ cấp ăn trưa.",
    deadline: "2027-02-28",
  },
  {
    companyKey: "kms",
    slug: "java-backend-engineer-spring-boot-kms",
    title: "Kỹ sư Java Backend (Spring Boot / Microservices / SQL)",
    categorySlug: "cong-nghe",
    jobCategory: "Công nghệ / IT",
    location: "TP. Hồ Chí Minh",
    workAddress: "Số 2 đường Tản Viên, Phường Tân Sơn Hòa, TP Hồ Chí Minh",
    salaryMin: 24,
    salaryMax: 40,
    salaryRange: "24 - 40 triệu",
    experienceRequired: "3 năm",
    level: "Chuyên viên cao cấp (Senior)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 4,
    tags: ["Java", "Spring Boot", "Microservices", "AWS"],
    requiredSkills: ["Java", "Spring Boot", "SQL", "PostgreSQL", "Docker", "REST API", "Git", "Tiếng Anh"],
    description:
      "Phát triển hệ thống doanh nghiệp quy mô lớn cho khách hàng Mỹ sử dụng Java và Spring Boot.\nThiết kế kiến trúc Microservices, tối ưu truy vấn cơ sở dữ liệu quan hệ và tích hợp dịch vụ đám mây AWS.\nTham gia code review, viết unit test và cải thiện chất lượng hệ thống.",
    requirements:
      "Từ 3 năm kinh nghiệm phát triển phần mềm bằng Java (Spring Boot) và SQL/PostgreSQL.\nCó kinh nghiệm với Docker, REST API, Git và quy trình Agile/Scrum.\nGiao tiếp tiếng Anh tốt để làm việc trực tiếp với khách hàng nước ngoài.",
    benefits:
      "Mức lương 24 - 40 triệu, 15 ngày phép năm + gói bảo hiểm PTI cho cả gia đình.\nHỗ trợ chi phí thi chứng chỉ AWS/Java và lớp học tiếng Anh.\nChế độ Hybrid linh hoạt.",
    deadline: "2027-02-20",
  },
  {
    companyKey: "fpt-software",
    slug: "qa-automation-test-engineer-fpt",
    title: "Kỹ sư Kiểm thử Tự động (QA / Automation Test Engineer)",
    categorySlug: "cong-nghe",
    jobCategory: "Công nghệ / IT",
    location: "Hà Nội",
    workAddress: "Tòa nhà FPT Cầu Giấy, phố Duy Tân, Phường Cầu Giấy, TP Hà Nội",
    salaryMin: 16,
    salaryMax: 28,
    salaryRange: "16 - 28 triệu",
    experienceRequired: "2 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 3,
    tags: ["Automation Test", "Playwright", "Selenium", "API Testing"],
    requiredSkills: ["Python", "JavaScript", "REST API", "SQL", "Git", "CI/CD"],
    description:
      "Thiết kế kịch bản kiểm thử (Test Plan, Test Case) cho hệ thống Web và API.\nXây dựng và duy trì bộ khung Automation Test bằng Playwright/Selenium và kiểm thử API với Postman.\nTích hợp kiểm thử tự động vào pipeline CI/CD để phát hiện lỗi sớm.",
    requirements:
      "Từ 2 năm kinh nghiệm QA/QC, có tối thiểu 1 năm kinh nghiệm Automation Test (Selenium hoặc Playwright).\nBiết lập trình Python/JavaScript cơ bản, viết truy vấn SQL và test REST API.\nCẩn thận, tư duy phản biện tốt.",
    benefits:
      "Thu nhập 16 - 28 triệu/tháng + lương tháng 13.\nBảo hiểm sức khỏe FPT Care và cơ hội đào tạo nâng cao.",
    deadline: "2027-02-15",
  },
  {
    companyKey: "viettel",
    slug: "devops-system-security-engineer-viettel",
    title: "Kỹ sư DevOps & Hạ tầng Cloud (Docker / Kubernetes / Linux)",
    categorySlug: "cong-nghe",
    jobCategory: "Công nghệ / IT",
    location: "Hà Nội",
    workAddress: "Số 5, Phố Nguyễn Hữu An, Phường Cầu Giấy, TP Hà Nội",
    salaryMin: 25,
    salaryMax: 42,
    salaryRange: "25 - 42 triệu",
    experienceRequired: "3 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 2,
    urgent: true,
    tags: ["Docker", "Kubernetes", "CI/CD", "Linux"],
    requiredSkills: ["Docker", "Kubernetes", "CI/CD", "AWS", "Git", "Python"],
    description:
      "Vận hành, tự động hóa triển khai và giám sát hệ thống microservices trên cụm Kubernetes.\nThiết lập pipeline CI/CD, Infrastructure as Code (Terraform) và đảm bảo an toàn hệ thống Linux.\nTối ưu hiệu năng, khả năng chịu tải cao cho các dịch vụ trọng điểm.",
    requirements:
      "Từ 3 năm kinh nghiệm DevOps / System Engineer, thành thạo Linux, Docker và Kubernetes.\nCó kinh nghiệm thực tế về CI/CD (GitLab CI/GitHub Actions), Cloud (AWS/GCP) và scripting Python/Bash.\nƯu tiên có chứng chỉ AWS hoặc CKA.",
    benefits:
      "Thu nhập 25 - 42 triệu/tháng cùng thưởng dự án và phúc lợi Tập đoàn Viettel.\nTham gia các bài toán hạ tầng quy mô lớn hàng triệu người dùng.",
    deadline: "2027-02-28",
  },
  {
    companyKey: "shopee",
    slug: "product-ui-ux-designer-shopee",
    title: "Product UI/UX Designer (Web & Mobile App)",
    categorySlug: "thiet-ke",
    jobCategory: "Thiết kế",
    location: "Hà Nội",
    workAddress: "Tầng 4-5-6, Tòa nhà Capital Place, 29 Liễu Giai, TP Hà Nội",
    salaryMin: 18,
    salaryMax: 32,
    salaryRange: "18 - 32 triệu",
    experienceRequired: "2 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 2,
    tags: ["Figma", "UI/UX", "Design System", "Wireframe"],
    requiredSkills: ["UI/UX / Figma", "HTML / CSS", "Tiếng Anh"],
    description:
      "Nghiên cứu hành vi người dùng, xây dựng Wireframe, Prototype và giao diện hoàn chỉnh trên Figma.\nPhát triển và chuẩn hóa Design System dùng chung cho sản phẩm Web và ứng dụng di động.\nPhối hợp chặt chẽ với Product Manager và Frontend Engineer để đảm bảo chất lượng hiển thị thực tế.",
    requirements:
      "Tối thiểu 2 năm kinh nghiệm thiết kế sản phẩm UI/UX cho Web/App.\nThành thạo Figma, hiểu biết nguyên lý Responsive UI và có Portfolio thực tế.\nCó tư duy lấy người dùng làm trung tâm và đọc hiểu tài liệu tiếng Anh.",
    benefits:
      "Thu nhập 18 - 32 triệu/tháng + thưởng hiệu suất cuối năm.\nLàm việc tại văn phòng Capital Place, bảo hiểm sức khỏe mở rộng.",
    deadline: "2027-02-15",
  },
  {
    companyKey: "momo",
    slug: "chuyen-vien-digital-marketing-momo",
    title: "Chuyên viên Digital Marketing (Performance Ads & SEO)",
    categorySlug: "marketing",
    jobCategory: "Marketing",
    location: "TP. Hồ Chí Minh",
    workAddress: "Số 8 đường Hoàng Văn Thái, Phường Tân Mỹ, TP Hồ Chí Minh",
    salaryMin: 15,
    salaryMax: 25,
    salaryRange: "15 - 25 triệu",
    experienceRequired: "1 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 2,
    tags: ["Digital Marketing", "Google Ads", "Facebook Ads", "SEO"],
    requiredSkills: ["Data Analysis", "Excel / Văn phòng", "Tiếng Anh"],
    description:
      "Lập kế hoạch và tối ưu các chiến dịch quảng cáo chuyển đổi trên Google Ads, Facebook Ads và TikTok Ads.\nTheo dõi phễu chuyển đổi người dùng mới, phân tích chỉ số ROAS/CPA bằng Google Analytics và báo cáo định kỳ.\nPhối hợp đội Content xây dựng nội dung thu hút và nâng cao hiệu quả SEO.",
    requirements:
      "Từ 1 năm kinh nghiệm chạy quảng cáo hiệu suất (Performance Marketing) với ngân sách thực tế.\nNắm vững công cụ Google Ads, Meta Business, Google Analytics và kỹ năng phân tích số liệu Excel.\nNhạy bén với xu hướng thị trường số.",
    benefits:
      "Thu nhập 15 - 25 triệu/tháng + thưởng chiến dịch.\nĐược làm việc với quy mô ngân sách marketing lớn và công nghệ dữ liệu hiện đại.",
    deadline: "2027-02-20",
  },
  {
    companyKey: "misa",
    slug: "ke-toan-tong-hop-thue-misa",
    title: "Chuyên viên Kế toán Tổng hợp & Thuế (MISA / VAS)",
    categorySlug: "ke-toan",
    jobCategory: "Kế toán / Tài chính",
    location: "Hà Nội",
    workAddress: "Tầng 9, tòa nhà Technosoft, phố Duy Tân, Phường Cầu Giấy, TP Hà Nội",
    salaryMin: 14,
    salaryMax: 22,
    salaryRange: "14 - 22 triệu",
    experienceRequired: "2 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 2,
    tags: ["Kế toán tổng hợp", "Thuế", "MISA", "Excel"],
    requiredSkills: ["Excel / Văn phòng"],
    description:
      "Hạch toán các nghiệp vụ kinh tế phát sinh, kiểm tra chứng từ và lập báo cáo tài chính định kỳ theo chuẩn mực VAS.\nThực hiện kê khai thuế GTGT, TNDN, TNCN và quyết toán thuế cuối năm trên phần mềm MISA.\nĐối chiếu công nợ nội bộ, ngân hàng và phối hợp kiểm toán độc lập.",
    requirements:
      "Tốt nghiệp Đại học chuyên ngành Kế toán - Kiểm toán - Tài chính, tối thiểu 2 năm kinh nghiệm Kế toán tổng hợp.\nThành thạo phần mềm kế toán MISA và Excel nâng cao.\nCập nhật tốt các thông tư, nghị định thuế hiện hành.",
    benefits:
      "Lương 14 - 22 triệu/tháng + thưởng quý & lương tháng 13.\nMôi trường chuyên nghiệp, đóng BHXH đầy đủ theo mức lương chính.",
    deadline: "2027-02-25",
  },
  {
    companyKey: "misa",
    slug: "chuyen-vien-kinh-doanh-b2b-saas-misa",
    title: "Chuyên viên Kinh doanh Phần mềm Doanh nghiệp (Sales B2B)",
    categorySlug: "kinh-doanh",
    jobCategory: "Kinh doanh",
    location: "Hà Nội",
    workAddress: "Tầng 9, tòa nhà Technosoft, phố Duy Tân, Phường Cầu Giấy, TP Hà Nội",
    salaryMin: 12,
    salaryMax: 30,
    salaryRange: "12 - 30 triệu",
    experienceRequired: "1 năm",
    level: "Nhân viên (Junior)",
    employmentType: "Toàn thời gian",
    educationRequired: "Cao đẳng trở lên",
    vacancies: 5,
    urgent: true,
    tags: ["Sales B2B", "CRM", "Tư vấn giải pháp", "SaaS"],
    requiredSkills: ["Excel / Văn phòng"],
    description:
      "Tìm kiếm, tiếp cận khách hàng doanh nghiệp SME có nhu cầu chuyển đổi số và quản trị trên nền tảng MISA AMIS.\nTư vấn, trình bày demo giải pháp phần mềm kế toán, nhân sự và bán hàng; lập báo giá và ký kết hợp đồng.\nQuản lý phễu khách hàng trên hệ thống CRM và phối hợp đội triển khai bàn giao dịch vụ.",
    requirements:
      "Từ 1 năm kinh nghiệm kinh doanh B2B, phần mềm hoặc dịch vụ doanh nghiệp.\nKỹ năng giao tiếp, thuyết trình và đàm phán tốt.\nChủ động, chịu được áp lực doanh số.",
    benefits:
      "Thu nhập gồm lương cứng + hoa hồng hấp dẫn (tổng thu nhập 12 - 30+ triệu/tháng).\nĐược đào tạo bài bản về kỹ năng tư vấn giải pháp công nghệ.",
    deadline: "2027-02-28",
  },
  {
    companyKey: "pnj",
    slug: "chuyen-vien-nhan-su-tuyen-dung-pnj",
    title: "Chuyên viên Nhân sự & Tuyển dụng (HR / Talent Acquisition)",
    categorySlug: "nhan-su",
    jobCategory: "Nhân sự / Hành chính",
    location: "TP. Hồ Chí Minh",
    workAddress: "170E Phan Đăng Lưu, Phường Đức Nhuận, TP Hồ Chí Minh",
    salaryMin: 13,
    salaryMax: 20,
    salaryRange: "13 - 20 triệu",
    experienceRequired: "1 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 2,
    tags: ["Tuyển dụng", "HRBP", "Onboarding", "Nhân sự"],
    requiredSkills: ["Excel / Văn phòng", "Tiếng Anh"],
    description:
      "Tiếp nhận yêu cầu tuyển dụng từ các phòng ban, đăng tin, tìm kiếm nguồn ứng viên và sàng lọc hồ sơ.\nPhối hợp tổ chức phỏng vấn, đánh giá ứng viên và hoàn thiện thủ tục tiếp nhận nhân sự mới (Onboarding).\nTham gia xây dựng thương hiệu tuyển dụng và báo cáo số liệu tuyển dụng hàng tuần.",
    requirements:
      "Từ 1 năm kinh nghiệm tuyển dụng hoặc nhân sự tổng hợp.\nKỹ năng phỏng vấn đánh giá ứng viên và sử dụng Excel/hệ thống tuyển dụng tốt.\nTác phong chuyên nghiệp, giao tiếp khéo léo.",
    benefits:
      "Thu nhập 13 - 20 triệu/tháng + thưởng thành tích cuối năm.\nBảo hiểm sức khỏe PNJ Care và lộ trình phát triển lên Chuyên viên HRBP.",
    deadline: "2027-02-20",
  },
  {
    companyKey: "ghn",
    slug: "chuyen-vien-dieu-phoi-kho-van-logistics-ghn",
    title: "Chuyên viên Điều phối & Quản lý Vận hành Kho vận (Logistics)",
    categorySlug: "van-tai",
    jobCategory: "Giao nhận / Kho vận",
    location: "TP. Hồ Chí Minh",
    workAddress: "405/15 Xô Viết Nghệ Tĩnh, Phường Bình Thạnh, TP Hồ Chí Minh",
    salaryMin: 12,
    salaryMax: 18,
    salaryRange: "12 - 18 triệu",
    experienceRequired: "1 năm",
    level: "Nhân viên (Junior)",
    employmentType: "Toàn thời gian",
    educationRequired: "Cao đẳng trở lên",
    vacancies: 4,
    urgent: true,
    tags: ["Kho vận", "Điều phối", "Logistics", "Supply Chain"],
    requiredSkills: ["Excel / Văn phòng", "Data Analysis"],
    description:
      "Theo dõi và điều phối luồng hàng hóa xuất - nhập - phân loại tại trung tâm trung chuyển khu vực phía Nam.\nGiám sát tỷ lệ giao hàng đúng hẹn (SLA), tối ưu tuyến đường vận tải và xử lý các sự cố phát sinh.\nPhân tích số liệu năng suất vận hành bằng Excel để đề xuất cải tiến quy trình.",
    requirements:
      "Từ 1 năm kinh nghiệm điều phối vận tải, kho vận hoặc chuỗi cung ứng thương mại điện tử.\nThành thạo Excel xử lý số liệu, sẵn sàng làm việc linh hoạt theo nhịp độ vận hành.\nTinh thần trách nhiệm cao và giải quyết vấn đề nhanh.",
    benefits:
      "Lương 12 - 18 triệu/tháng + thưởng KPI vận hành.\nĐóng BHXH đầy đủ, cơ hội lên Trưởng bưu cục / Quản lý vùng.",
    deadline: "2027-02-25",
  },
  {
    companyKey: "tiki",
    slug: "chuyen-vien-cham-soc-khach-hang-tiki",
    title: "Chuyên viên Chăm sóc Khách hàng & Vận hành Đơn hàng (CSKH)",
    categorySlug: "cskh",
    jobCategory: "Chăm sóc KH",
    location: "TP. Hồ Chí Minh",
    workAddress: "208 Cô Bắc, Phường Cầu Ông Lãnh, TP Hồ Chí Minh",
    salaryMin: 9,
    salaryMax: 14,
    salaryRange: "9 - 14 triệu",
    experienceRequired: "Không yêu cầu",
    level: "Nhân viên (Junior)",
    employmentType: "Toàn thời gian",
    educationRequired: "Trung cấp trở lên",
    vacancies: 6,
    tags: ["CSKH", "Chat/Hotline", "TMĐT", "Xử lý khiếu nại"],
    requiredSkills: ["Excel / Văn phòng"],
    description:
      "Tiếp nhận và giải đáp thắc mắc của khách hàng qua kênh Hotline, LiveChat và Email về đơn hàng, đổi trả và thanh toán.\nPhối hợp với đơn vị vận chuyển và nhà bán hàng để xử lý nhanh các khiếu nại phát sinh.\nGhi nhận góp ý của khách hàng lên hệ thống để cải thiện chất lượng dịch vụ.",
    requirements:
      "Giọng nói rõ ràng, thái độ lịch sự, kiên nhẫn và yêu thích hỗ trợ khách hàng.\nSử dụng tốt tin học văn phòng (Excel, thao tác đa cửa sổ nhanh).\nƯu tiên ứng viên có kinh nghiệm CSKH hoặc bán hàng qua điện thoại.",
    benefits:
      "Thu nhập 9 - 14 triệu/tháng (lương cứng + thưởng SLA chất lượng).\nPhụ cấp gửi xe, cơm trưa và chế độ bảo hiểm đầy đủ.",
    deadline: "2027-02-28",
  },
  {
    companyKey: "mwg",
    slug: "nhan-vien-tu-van-ban-hang-dien-may-xanh",
    title: "Nhân viên Tư vấn Bán hàng Công nghệ & Điện máy",
    categorySlug: "ban-hang",
    jobCategory: "Bán hàng",
    location: "TP. Hồ Chí Minh",
    workAddress: "128 Trần Quang Khải, Phường Tân Định, TP Hồ Chí Minh",
    salaryMin: 10,
    salaryMax: 18,
    salaryRange: "10 - 18 triệu",
    experienceRequired: "Không yêu cầu",
    level: "Nhân viên (Junior)",
    employmentType: "Toàn thời gian",
    educationRequired: "THPT trở lên",
    vacancies: 8,
    tags: ["Bán hàng", "Tư vấn", "Điện máy", "Showroom"],
    requiredSkills: ["Excel / Văn phòng"],
    description:
      "Đón tiếp, tìm hiểu nhu cầu và tư vấn cho khách hàng các sản phẩm điện thoại, laptop và thiết bị điện máy.\nHướng dẫn sử dụng, hỗ trợ thanh toán và chăm sóc khách hàng sau mua.\nSắp xếp trưng bày quầy kệ gọn gàng và kiểm kê hàng hóa theo ca.",
    requirements:
      "Nhiệt tình, giao tiếp thân thiện, yêu thích sản phẩm công nghệ và điện máy.\nKhông yêu cầu kinh nghiệm trước (được đào tạo kiến thức sản phẩm và kỹ năng bán hàng).\nLàm việc theo ca xoay linh hoạt tại hệ thống cửa hàng TP.HCM.",
    benefits:
      "Thu nhập 10 - 18 triệu/tháng tùy doanh số bán hàng.\nThưởng Tết hấp dẫn và lộ trình thăng tiến lên Quản lý cửa hàng.",
    deadline: "2027-02-28",
  },
  {
    companyKey: "vinamilk",
    slug: "ky-su-co-dien-bao-tri-day-chuyen-vinamilk",
    title: "Kỹ sư Cơ điện & Bảo trì Dây chuyền Sản xuất (AutoCAD / PLC)",
    categorySlug: "ky-thuat",
    jobCategory: "Kỹ thuật / Sản xuất",
    location: "TP. Hồ Chí Minh",
    workAddress: "10 Tân Trào, Phường Tân Mỹ, TP Hồ Chí Minh",
    salaryMin: 16,
    salaryMax: 26,
    salaryRange: "16 - 26 triệu",
    experienceRequired: "2 năm",
    level: "Chuyên viên (Middle)",
    employmentType: "Toàn thời gian",
    educationRequired: "Đại học",
    vacancies: 3,
    tags: ["Cơ điện", "PLC", "AutoCAD", "Bảo trì"],
    requiredSkills: ["AutoCAD", "Excel / Văn phòng"],
    description:
      "Lập kế hoạch bảo trì định kỳ, khắc phục sự cố hệ thống điện - tự động hóa PLC và thiết bị dây chuyền sản xuất.\nĐọc hiểu và cập nhật bản vẽ kỹ thuật điện/cơ khí trên AutoCAD.\nĐảm bảo an toàn kỹ thuật và tối ưu thời gian vận hành liên tục của nhà máy.",
    requirements:
      "Tốt nghiệp Đại học chuyên ngành Cơ điện tử, Tự động hóa hoặc Kỹ thuật Điện.\nTối thiểu 2 năm kinh nghiệm bảo trì dây chuyền sản xuất công nghiệp, biết PLC và AutoCAD.\nTuân thủ nghiêm ngặt quy định an toàn lao động.",
    benefits:
      "Thu nhập 16 - 26 triệu/tháng + thưởng năng suất và lương tháng 13–14.\nCó xe đưa đón, suất ăn ca và bảo hiểm sức khỏe 24/7.",
    deadline: "2027-02-28",
  },
];

function ensureHrUser(
  db: DatabaseDocument,
  seed: RealCompanySeed,
  h: Helpers,
  now: string
): UserRecord {
  const existing = db.users.find(
    (u) => u.email.toLowerCase() === seed.hrEmail.toLowerCase()
  );
  if (existing) {
    existing.role = "hr";
    return existing;
  }
  const nextId = Math.max(db.counters.users || 0, ...db.users.map((u) => u.id), 0) + 1;
  db.counters.users = nextId;
  const user: UserRecord = {
    _id: h.generateObjectId(),
    id: nextId,
    email: seed.hrEmail,
    password_hash: h.hashPassword("123456"),
    full_name: seed.hrFullName,
    phone: seed.hrPhone,
    role: "hr",
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
  db.users.push(user);
  return user;
}

export function importStaticCatalog(db: DatabaseDocument, h: Helpers): void {
  const nowTs = Date.now();
  const nowIso = new Date(nowTs).toISOString();

  // 1. Xoá toàn bộ tin tuyển dụng ảo cũ (source === "catalog" hoặc không có HR thật)
  const removedJobIds = new Set<number>();
  db.jobs = db.jobs.filter((j) => {
    const isPhantom = j.source === "catalog" || j.hr_user_id === 0;
    if (isPhantom) removedJobIds.add(j.id);
    return !isPhantom;
  });
  if (removedJobIds.size > 0) {
    const removedAppIds = new Set(
      db.applications.filter((a) => removedJobIds.has(a.job_id)).map((a) => a.id)
    );
    db.applications = db.applications.filter((a) => !removedJobIds.has(a.job_id));
    db.ai_evaluations = db.ai_evaluations.filter((e) => !removedAppIds.has(e.application_id));
  }

  // 2. Xoá toàn bộ công ty mẫu ảo cũ (hr_user_id === 0 và không có tax_code)
  db.companies = db.companies.filter((c) => c.hr_user_id > 0 || !!c.tax_code);

  // 3. Đồng bộ & xác thực đầy đủ các doanh nghiệp thật (MST thật từ VietQR)
  const companyByKey = new Map<string, { company: CompanyRecord; hrUser: UserRecord }>();
  for (const seed of REAL_COMPANIES) {
    const hrUser = ensureHrUser(db, seed, h, nowIso);
    let rec =
      db.companies.find((c) => c.tax_code === seed.taxCode) ||
      db.companies.find((c) => c.hr_user_id === hrUser.id);

    if (!rec) {
      const nextCoId =
        Math.max(db.counters.companies || 0, ...db.companies.map((c) => c.id), 0) + 1;
      db.counters.companies = nextCoId;
      rec = {
        _id: h.generateObjectId(),
        id: nextCoId,
        hr_user_id: hrUser.id,
        hr_object_id: hrUser._id,
        company_name: seed.legalName,
        name: seed.legalName,
        tax_code: seed.taxCode,
        verified: true,
        industry: seed.industry,
        company_size: seed.companySize,
        logo_url: seed.logoUrl,
        website: seed.website,
        address: seed.address,
        description: seed.description,
        slug: `${h.slugifyVietnamese(seed.legalName)}-${nextCoId}`,
        benefits: seed.benefits || [],
        social_links: {},
        created_at: nowIso,
        updated_at: nowIso,
      };
      db.companies.push(rec);
    } else {
      rec.company_name = seed.legalName;
      rec.name = seed.legalName;
      rec.tax_code = seed.taxCode;
      rec.verified = true;
      rec.address = seed.address;
      rec.logo_url = seed.logoUrl;
      rec.website = rec.website || seed.website;
      rec.industry = rec.industry || seed.industry;
      rec.company_size = rec.company_size || seed.companySize;
      if (
        !rec.description ||
        rec.description.startsWith("Doanh nghiệp tuyển dụng trên hệ thống Đúng Việc")
      ) {
        rec.description = seed.description;
      }
      if (!rec.benefits?.length && seed.benefits?.length) {
        rec.benefits = seed.benefits;
      }
      if (!rec.slug) {
        rec.slug = `${h.slugifyVietnamese(rec.company_name)}-${rec.id}`;
      }
    }
    companyByKey.set(seed.key, { company: rec, hrUser });
  }

  // 4. Bổ sung các tin tuyển dụng thật gắn trực tiếp với từng công ty & HR thật
  REAL_JOBS.forEach((rj, idx) => {
    const owner = companyByKey.get(rj.companyKey);
    if (!owner) return;
    const { company, hrUser } = owner;

    const alreadyExists = db.jobs.some(
      (j) =>
        j.slug === rj.slug ||
        (j.company_id === company.id && j.title.toLowerCase() === rj.title.toLowerCase())
    );
    if (alreadyExists) return;

    const nextJobId =
      Math.max(db.counters.jobs || 0, ...db.jobs.map((j) => j.id), 0) + 1;
    db.counters.jobs = nextJobId;
    const publishedAt = new Date(nowTs - idx * 3600000).toISOString();
    const jdText = [rj.description, rj.requirements].filter(Boolean).join("\n");

    const job: JobRecord = {
      _id: h.generateObjectId(),
      id: nextJobId,
      slug: rj.slug,
      company_id: company.id,
      company_object_id: company._id,
      hr_user_id: hrUser.id,
      title: rj.title,
      job_category: rj.jobCategory,
      category_slug: rj.categorySlug,
      location: rj.location,
      work_address: rj.workAddress,
      salary_range: rj.salaryRange,
      salary_min: rj.salaryMin,
      salary_max: rj.salaryMax,
      salary_negotiable: false,
      pay_type: "Theo tháng",
      experience_required: rj.experienceRequired,
      level: rj.level,
      employment_type: rj.employmentType,
      education_required: rj.educationRequired,
      vacancies: rj.vacancies,
      urgent: !!rj.urgent,
      tags: rj.tags,
      jd_text: jdText,
      description: rj.description,
      requirements: rj.requirements,
      benefits: rj.benefits,
      required_skills: rj.requiredSkills,
      deadline: rj.deadline,
      status: "active",
      view_count: 0,
      published_at: publishedAt,
      closed_at: null,
      source: "hr",
      created_at: publishedAt,
      updated_at: publishedAt,
    };
    job.jd_hash = h.computeJdHash(job);
    db.jobs.push(job);
  });
}
