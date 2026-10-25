from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DIAGRAM_DIR = ROOT / "docs" / "diagrams"
SOURCES = [
    "1_use_case.drawio",
    "2_quy_trinh_nghiep_vu.drawio",
    "3_erd.drawio",
    "4_ai_pipeline.drawio",
    "5_kien_truc.drawio",
    "6_trang_thai_ho_so.drawio",
]
OUTPUTS = [
    DIAGRAM_DIR / "HE_THONG_TUYEN_DUNG_AI_ALL_DIAGRAMS.drawio",
    ROOT / "filebaocao" / "HE_THONG_TUYEN_DUNG_AI_ALL_DIAGRAMS.drawio",
]


def main() -> None:
    master = ET.Element(
        "mxfile",
        {
            "host": "app.diagrams.net",
            "modified": "2026-10-16T00:00:00.000Z",
            "agent": "Codex",
            "version": "24.7.17",
            "type": "device",
        },
    )
    for number, source_name in enumerate(SOURCES, start=1):
        source_root = ET.parse(DIAGRAM_DIR / source_name).getroot()
        diagram = deepcopy(source_root.find("diagram"))
        if diagram is None:
            raise ValueError(f"Không tìm thấy diagram trong {source_name}")
        old_name = diagram.get("name", source_name)
        diagram.set("name", f"{number}. {old_name}")
        master.append(diagram)

    ET.indent(master, space="  ")
    xml = ET.tostring(master, encoding="utf-8", xml_declaration=True)
    for output in OUTPUTS:
        output.write_bytes(xml)
        print(output)


if __name__ == "__main__":
    main()
