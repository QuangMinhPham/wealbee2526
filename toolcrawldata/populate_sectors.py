"""
Đọc Thong_tin_doanh_nghiep_merged_final.csv → UPDATE stocks table:
  sector_name (tên tiếng Việt gốc)
  sector_slug (slug chuẩn dùng trong pipeline)

Chạy:
  python populate_sectors.py /path/to/Thong_tin_doanh_nghiep_merged_final.csv
  python populate_sectors.py   # tự tìm trong ~/Downloads/
"""
import sys
import csv
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')
sys.path.insert(0, str(Path(__file__).parent))
from supabase_writer import get_client

# Ánh xạ 23 ngành từ CSV → slug chuẩn trong pipeline
SECTOR_SLUG: dict[str, str] = {
    'Tổ chức tín dụng':                                   'ngan_hang',
    'Bất động sản':                                        'bat_dong_san',
    'Dịch vụ tài chính':                                   'chung_khoan',
    'Nguyên vật liệu':                                     'vat_lieu_co_ban',
    'Thực phẩm, đồ uống và thuốc lá':                    'thuc_pham_do_uong',
    'Hàng hóa công nghiệp':                                'hang_hoa_cong_nghiep',
    'Xe và linh kiện':                                     'hang_hoa_cong_nghiep',
    'Tiện ích':                                            'tien_ich',
    'Năng lượng':                                          'nang_luong_dau_khi',
    'Vận tải':                                             'hang_khong_logistics',
    'Phần mềm và dịch vụ':                                'cong_nghe_vien_thong',
    'Dịch vụ viễn thông':                                  'cong_nghe_vien_thong',
    'Phần cứng và thiết bị':                               'cong_nghe_vien_thong',
    'Thời trang và hàng lâu bền':                         'det_may_xuat_khau',
    'Thương mại hàng thiết yếu':                          'ban_le_tieu_dung',
    'Thương mại hàng không thiết yếu':                    'ban_le_tieu_dung',
    'Sản phẩm chăm sóc cá nhân và gia đình':             'ban_le_tieu_dung',
    'Dược phẩm, công nghệ sinh học và khoa học sự sống': 'duoc_pham_y_te',
    'Thiết bị và dịch vụ chăm sóc sức khỏe':            'duoc_pham_y_te',
    'Bảo hiểm':                                            'bao_hiem',
    'Dịch vụ tiêu dùng':                                   'dich_vu_tieu_dung',
    'Dịch vụ thương mại và chuyên nghiệp':               'dich_vu_thuong_mai',
    'Truyền thông và giải trí':                            'truyen_thong',
}


def main():
    # Tìm CSV
    if len(sys.argv) > 1:
        csv_path = Path(sys.argv[1])
    else:
        candidates = [
            Path.home() / 'Downloads' / 'Thong_tin_doanh_nghiep_merged_final.csv',
            Path(__file__).parent.parent / 'Thong_tin_doanh_nghiep_merged_final.csv',
        ]
        csv_path = next((p for p in candidates if p.exists()), None)
        if not csv_path:
            print('ERROR: Không tìm thấy file CSV. Chạy: python populate_sectors.py /path/to/file.csv')
            sys.exit(1)

    print(f'Đọc CSV: {csv_path}')

    # Đọc CSV
    rows: list[tuple[str, str, str]] = []
    unknown_sectors: set[str] = set()

    for encoding in ('utf-8', 'utf-8-sig', 'latin-1'):
        try:
            with open(csv_path, encoding=encoding) as f:
                reader = csv.DictReader(f)
                for row in reader:
                    symbol      = (row.get('Mã CK▲') or '').strip().rstrip('\xa0').upper()
                    sector_name = (row.get('Ngành') or '').strip()
                    if not symbol or not sector_name:
                        continue
                    slug = SECTOR_SLUG.get(sector_name)
                    if slug:
                        rows.append((symbol, sector_name, slug))
                    else:
                        unknown_sectors.add(sector_name)
            break
        except UnicodeDecodeError:
            continue

    print(f'  -> Đọc được {len(rows)} dòng hợp lệ')
    if unknown_sectors:
        print(f'  WARN: {len(unknown_sectors)} ngành chưa có slug (bỏ qua):')
        for s in sorted(unknown_sectors):
            print(f'    "{s}"')

    sb = get_client()
    updated = errors = 0

    for symbol, sector_name, slug in rows:
        try:
            sb.table('stocks').update({
                'sector_name': sector_name,
                'sector_slug': slug,
            }).eq('symbol', symbol).execute()
            updated += 1
            if updated % 200 == 0:
                print(f'  {updated}/{len(rows)} đã update...')
        except Exception as e:
            print(f'  ERR {symbol}: {e}')
            errors += 1

    print(f'\n  Xong: {updated} updated | {errors} lỗi | {len(rows) - updated - errors} bỏ qua')


if __name__ == '__main__':
    main()
