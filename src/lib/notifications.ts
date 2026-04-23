export type NotificationSeverity = 'critical' | 'warning' | 'info';

export type NotificationType =
  | 'DIVIDEND_SAFETY_DROP'   // Điểm an toàn cổ tức giảm
  | 'EARNINGS_MISS'          // KQKD hụt kỳ vọng
  | 'MACRO_RATE'             // Lãi suất / chính sách tiền tệ
  | 'EXCHANGE_RATE'          // Tỷ giá
  | 'MARKET_FLOW'            // Dòng vốn / chỉ số thị trường
  | 'INDEX_REBALANCING'      // MSCI / VN30 rebalancing
  | 'EX_DIVIDEND_ALERT'      // Sắp đến ngày GDKHQ
  | 'GOLD_ALERT'             // Vàng / SJC
  | 'CRYPTO_ALERT'           // Tiền điện tử
  | 'BOND_ALERT';            // Trái phiếu / lãi suất TP

export interface Notification {
  id: string;
  type: NotificationType;
  assetClass: 'stock' | 'gold' | 'crypto' | 'bond' | 'macro';
  severity: NotificationSeverity;
  title: string;
  /** 1-2 dòng headline impact */
  impact: string;
  /** Chi tiết 2-3 dòng với số liệu cụ thể */
  summary: string;
  ticker?: string;
  /** Prompt đã soạn sẵn, giàu context, gửi thẳng vào Bee AI */
  aiPrompt: string;
  timestamp: Date;
  read: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK — Dữ liệu giả lập, các kịch bản thật sự quan trọng với nhà đầu tư cá nhân
// Bao phủ: Cổ phiếu · Vàng · Crypto · Trái phiếu · Vĩ mô
// ─────────────────────────────────────────────────────────────────────────────
export const mockNotifications: Notification[] = [

  // ── CRITICAL ───────────────────────────────────────────────────────────────

  {
    id: 'n1',
    type: 'DIVIDEND_SAFETY_DROP',
    assetClass: 'stock',
    severity: 'critical',
    title: 'HPG: Điểm an toàn cổ tức sụt giảm nghiêm trọng',
    impact: 'Điểm an toàn HPG giảm 71 → 44 (-27đ). Nguy cơ cắt giảm cổ tức năm tới cao.',
    summary:
      'Giá thép HRC giảm 18% từ tháng 10/2025 do Trung Quốc phá giá thép xuất khẩu. '
      + 'Biên lợi nhuận gộp HPG thu hẹp từ 15% → 9%, FCF âm trong Q4. '
      + 'Nợ ròng tăng lên 35,000 tỷ đồng, payout ratio đạt 94% — vượt ngưỡng bền vững.',
    ticker: 'HPG',
    aiPrompt:
      'HPG vừa bị hạ điểm an toàn cổ tức từ 71 xuống 44 điểm do: (1) giá thép HRC giảm 18% vì Trung Quốc phá giá xuất khẩu, (2) biên lợi nhuận gộp thu hẹp từ 15% xuống 9%, (3) FCF âm Q4, (4) nợ ròng 35,000 tỷ và payout ratio 94%. '
      + 'Tôi đang giữ HPG trong danh mục. Hãy phân tích: chu kỳ thép VN đang ở đâu, khi nào có thể phục hồi, '
      + 'và đề xuất cụ thể: tôi nên cắt giảm tỷ trọng, giữ nguyên hay tăng thêm? '
      + 'Nếu cắt, tôi nên chuyển sang cổ phiếu nào có Safety Score cao hơn và dividend yield tương đương?',
    timestamp: new Date(Date.now() - 6 * 60 * 1000),
    read: false,
  },

  {
    id: 'n2',
    type: 'MACRO_RATE',
    assetClass: 'macro',
    severity: 'critical',
    title: 'NHNN bất ngờ tăng lãi suất điều hành thêm 50 bps',
    impact: 'Lãi suất OMO tăng từ 4.5% → 5.0%. Toàn thị trường chịu áp lực định giá lại.',
    summary:
      'Ngân hàng Nhà nước VN tăng lãi suất không báo trước để bảo vệ tỷ giá USD/VND '
      + '(đang tiếp cận ngưỡng 26,000). Đây là lần tăng đầu tiên từ Q1/2023. '
      + 'Nhóm bất động sản, ngân hàng, và cổ phiếu vốn hóa lớn sẽ bị định giá lại ngay hôm nay. '
      + 'Trái phiếu doanh nghiệp lãi suất cố định mất giá tức thì.',
    aiPrompt:
      'NHNN vừa bất ngờ tăng lãi suất OMO từ 4.5% lên 5.0% — lần tăng đầu tiên từ 2023 — nhằm bảo vệ tỷ giá. '
      + 'Danh mục tôi hiện có cổ phiếu ngân hàng (VCB, ACB), bất động sản (VIC, NLG) và trái phiếu doanh nghiệp. '
      + 'Hãy phân tích: (1) Nhóm nào trong danh mục bị ảnh hưởng nặng nhất và tại sao? '
      + '(2) Lãi suất tăng ảnh hưởng thế nào đến dividend yield và định giá P/E hợp lý? '
      + '(3) Tôi có nên tăng tỷ trọng tiền gửi/trái phiếu chính phủ ngắn hạn lúc này không? '
      + 'Đề xuất kế hoạch tái cân bằng danh mục cụ thể.',
    timestamp: new Date(Date.now() - 22 * 60 * 1000),
    read: false,
  },

  // ── WARNING ────────────────────────────────────────────────────────────────

  {
    id: 'n3',
    type: 'EXCHANGE_RATE',
    assetClass: 'macro',
    severity: 'warning',
    title: 'USD/VND tiếp cận ngưỡng 26,000 — áp lực nhập khẩu lạm phát',
    impact: 'Tỷ giá USD/VND tại 25,970 (+1.4% tháng). Tác động đến 60% cổ phiếu nhập khẩu nguyên liệu.',
    summary:
      'DXY (chỉ số USD) tăng lên 108.2 sau số liệu việc làm Mỹ tốt hơn kỳ vọng, '
      + 'kéo VND mất giá. Các doanh nghiệp có chi phí nguyên liệu nhập khẩu (VNM, MSN, HPG) '
      + 'sẽ thấy biên lợi nhuận co lại. Crypto trong danh mục tăng giá trị quy đổi VND.',
    aiPrompt:
      'USD/VND đang ở mức 25,970 (+1.4% trong tháng), tiếp cận ngưỡng tâm lý 26,000. '
      + 'DXY tăng do số liệu việc làm Mỹ vượt kỳ vọng. '
      + 'Trong danh mục tôi có VNM (nhập khẩu sữa bột), MSN (nguyên liệu thực phẩm), HPG (nhập thép phế liệu), '
      + 'và một phần crypto (BTC, ETH). '
      + 'Hãy phân tích: (1) Mỗi cổ phiếu bị ảnh hưởng thế nào khi VND mất 1% giá trị? '
      + '(2) Tỷ giá cao có phải là thời điểm tốt để tăng tỷ trọng crypto không? '
      + '(3) Các cổ phiếu xuất khẩu nào tôi có thể cân nhắc như hedge tỷ giá?',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    read: false,
  },

  {
    id: 'n4',
    type: 'EARNINGS_MISS',
    assetClass: 'stock',
    severity: 'warning',
    title: 'VNM Q4/2025: Doanh thu hụt 8%, EPS giảm 15% — tín hiệu cổ tức rủi ro',
    impact: 'KQKD VNM thấp hơn kỳ vọng thị trường. Khả năng duy trì cổ tức 2026 cần đánh giá lại.',
    summary:
      'Doanh thu VNM Q4/2025 đạt 14,800 tỷ (-8% vs ước tính 16,100 tỷ). '
      + 'Nguyên nhân: tiêu thụ sữa trong nước giảm 4.5% YoY (xu hướng sinh ít con), '
      + 'giá sữa bột nhập khẩu cao, áp lực cạnh tranh từ Vinamilk nước ngoài. '
      + 'Payout ratio dự phóng 2026 lên đến 96% nếu EPS không hồi phục.',
    ticker: 'VNM',
    aiPrompt:
      'VNM vừa công bố KQKD Q4/2025 với doanh thu thấp hơn kỳ vọng 8% và EPS giảm 15% do: '
      + '(1) tiêu thụ sữa nội địa giảm 4.5% YoY vì dân số trẻ giảm, '
      + '(2) chi phí nguyên liệu nhập khẩu tăng do tỷ giá, '
      + '(3) cạnh tranh từ các thương hiệu ngoại ngày càng tăng. '
      + 'Tôi giữ VNM vì cổ tức ổn định. '
      + 'Hãy phân tích: xu hướng dài hạn của ngành sữa VN là gì, '
      + 'liệu cổ tức VNM có an toàn trong 2-3 năm tới không, '
      + 'và tôi có nên chuyển một phần vị thế VNM sang cổ phiếu tiêu dùng khác không?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
  },

  {
    id: 'n5',
    type: 'GOLD_ALERT',
    assetClass: 'gold',
    severity: 'warning',
    title: 'Vàng SJC: Chênh lệch với quốc tế vọt lên 3.5 triệu/lượng',
    impact: 'SBV tạm dừng đấu thầu vàng. Nắm giữ SJC có lợi ngắn hạn nhưng rủi ro thanh khoản tăng.',
    summary:
      'Giá vàng quốc tế: $2,920/oz (cao nhất lịch sử). '
      + 'Vàng SJC: 100.5 triệu/lượng — chênh lệch với giá quốc tế quy đổi là 3.5 triệu đồng. '
      + 'NHNN tạm ngưng đấu thầu vàng miếng tuần này, nguồn cung thắt chặt. '
      + 'Khi NHNN tái khởi động đấu thầu, giá SJC có thể điều chỉnh mạnh.',
    aiPrompt:
      'Giá vàng SJC hiện ở 100.5 triệu/lượng, chênh lệch 3.5 triệu so với giá quốc tế quy đổi. '
      + 'NHNN vừa tạm dừng đấu thầu vàng, khiến premium nở rộng. '
      + 'Tôi đang giữ một lượng vàng SJC trong danh mục. '
      + 'Hãy phân tích: (1) Tại sao premium SJC lại cao bất thường so với vàng quốc tế? '
      + '(2) Khi NHNN tái khởi động đấu thầu, điều gì sẽ xảy ra với giá SJC? '
      + '(3) Tôi có nên chốt lời vàng SJC một phần và chuyển sang vàng nhẫn hay ETF vàng không? '
      + '(4) Dự báo giá vàng quốc tế trong Q2/2026 dựa trên chu kỳ lãi suất FED.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    read: false,
  },

  {
    id: 'n6',
    type: 'INDEX_REBALANCING',
    assetClass: 'stock',
    severity: 'warning',
    title: 'MSCI Frontier Markets: MWG có nguy cơ bị loại khỏi rổ tháng 3',
    impact: 'Nếu bị loại, quỹ foreign tracking MSCI buộc bán ~18 triệu cổ phần MWG trong 1-2 tuần.',
    summary:
      'MSCI bán kỳ đánh giá tháng 3 đang xem xét loại MWG do free-float giảm xuống 18.3% '
      + '(dưới ngưỡng tối thiểu 20%). Quyết định công bố 28/02, hiệu lực 01/03/2026. '
      + 'Khối ngoại hiện đang nắm ~12% MWG — áp lực bán kỹ thuật lên đến 950 tỷ đồng.',
    ticker: 'MWG',
    aiPrompt:
      'MSCI đang xem xét loại MWG khỏi rổ Frontier Markets do free-float giảm xuống 18.3%. '
      + 'Nếu bị loại hiệu lực 01/03/2026, các quỹ nước ngoài sẽ buộc phải bán ~18 triệu cổ phần (~950 tỷ đồng áp lực bán). '
      + 'Tôi đang có MWG trong danh mục. '
      + 'Hãy phân tích: (1) Xác suất MWG bị loại là bao nhiêu và điều gì có thể thay đổi quyết định? '
      + '(2) Nếu bị loại, MWG có thể giảm bao nhiêu phần trăm trong ngắn hạn? '
      + '(3) Đây có phải cơ hội mua thêm khi áp lực bán kỹ thuật kết thúc không, '
      + 'hay vấn đề fundamentals MWG cần được lo ngại hơn?',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    read: false,
  },

  // ── INFO ───────────────────────────────────────────────────────────────────

  {
    id: 'n7',
    type: 'CRYPTO_ALERT',
    assetClass: 'crypto',
    severity: 'info',
    title: 'Bitcoin ETF: Dòng tiền vào ròng $2.1 tỷ/tuần — mạnh nhất 3 tháng',
    impact: 'BTC tiếp cận $105,000. Tổng tài sản 11 ETF Bitcoin Mỹ vượt $85 tỷ USD.',
    summary:
      'Tuần này, 11 Bitcoin ETF tại Mỹ ghi nhận inflow ròng $2.1 tỷ (BlackRock IBIT: $890M, Fidelity FBTC: $420M). '
      + 'Đây là tuần inflow mạnh nhất từ tháng 11/2025. '
      + 'BTC spot đang ở $104,200, ETH ở $3,850. '
      + 'Thị trường đang định giá xác suất FED cắt giảm lãi suất Q2/2026 là 68%.',
    aiPrompt:
      'Bitcoin ETF tại Mỹ ghi nhận inflow ròng $2.1 tỷ trong tuần (mạnh nhất 3 tháng), '
      + 'với BTC hiện ở $104,200 và ETH ở $3,850. '
      + 'Thị trường đang định giá 68% khả năng FED cắt lãi suất Q2/2026. '
      + 'Tôi đang giữ BTC và ETH trong danh mục. '
      + 'Hãy phân tích: (1) Inflow ETF lớn có phải là tín hiệu bullish bền vững hay chỉ là momentum ngắn hạn? '
      + '(2) Mối quan hệ giữa kỳ vọng lãi suất FED và giá BTC trong lịch sử? '
      + '(3) Tỷ trọng crypto hợp lý trong một danh mục đầu tư tập trung cổ tức là bao nhiêu? '
      + '(4) Tôi có nên chốt lời một phần crypto để tái đầu tư vào cổ phiếu đang bị định giá thấp không?',
    timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000),
    read: false,
  },

  {
    id: 'n8',
    type: 'EX_DIVIDEND_ALERT',
    assetClass: 'stock',
    severity: 'info',
    title: 'ACB: Ngày GDKHQ còn 2 ngày — Cổ tức tiền mặt 1,500đ/cổ phiếu',
    impact: 'Cần giữ ACB trước 28/02/2026 để nhận cổ tức. Yield ~4.8% trên giá hiện tại.',
    summary:
      'ACB chốt danh sách cổ đông ngày 28/02/2026 (thứ Sáu), chi trả cổ tức 1,500đ/cp bằng tiền mặt. '
      + 'Tại giá ACB 31,200đ, yield là 4.8%. Ngày thanh toán dự kiến 20/03/2026. '
      + 'Lưu ý: sau ngày GDKHQ, giá cổ phiếu thường điều chỉnh giảm xấp xỉ mức cổ tức.',
    ticker: 'ACB',
    aiPrompt:
      'ACB sắp đến ngày giao dịch không hưởng quyền (28/02/2026) với cổ tức 1,500đ/cổ phiếu, yield ~4.8%. '
      + 'Tôi đang giữ ACB. '
      + 'Hãy giúp tôi: (1) Tính toán cổ tức tôi sẽ nhận dựa trên số cổ phần đang nắm giữ. '
      + '(2) Phân tích chiến lược: giữ qua ngày GDKHQ để nhận cổ tức hay bán trước và mua lại sau khi giá điều chỉnh? '
      + '(3) Đánh giá triển vọng cổ tức ACB cho năm 2026 dựa trên KQKD gần nhất — '
      + 'liệu mức cổ tức có được duy trì hay tăng không?',
    timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000),
    read: true,
  },

  {
    id: 'n9',
    type: 'BOND_ALERT',
    assetClass: 'bond',
    severity: 'info',
    title: 'Trái phiếu CP 10 năm: Lợi suất giảm về 4.1% — thấp nhất từ 2022',
    impact: 'Danh mục trái phiếu hiện tại tăng giá trị. Cơ hội khóa lãi suất trước khi giảm thêm.',
    summary:
      'Lợi suất TPCP 10 năm giảm về 4.1% do kỳ vọng NHNN nới lỏng trong H2/2026. '
      + 'Điều này kéo giá TPCP tăng 3-5%. Tuy nhiên với lãi suất thực dương ngày càng thu hẹp, '
      + 'cổ phiếu cổ tức cao (yield > 5%) vẫn hấp dẫn hơn trái phiếu trong dài hạn.',
    aiPrompt:
      'Lợi suất trái phiếu chính phủ VN kỳ hạn 10 năm giảm về 4.1% — mức thấp nhất từ 2022. '
      + 'Tôi đang có một phần danh mục ở tài sản thu nhập cố định. '
      + 'Hãy phân tích: (1) Xu hướng lãi suất VN trong 12 tháng tới sẽ đi về đâu? '
      + '(2) Ở mức yield 4.1%, trái phiếu chính phủ có còn hấp dẫn hơn cổ phiếu cổ tức yield 5-6% không? '
      + '(3) Chiến lược tối ưu cho phần tài sản thu nhập cố định trong danh mục lúc này là gì: '
      + 'kéo dài duration để hưởng lợi nếu lãi suất giảm thêm, hay chuyển dần sang cổ phiếu cổ tức chất lượng cao?',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    read: true,
  },

  {
    id: 'n10',
    type: 'MACRO_RATE',
    assetClass: 'macro',
    severity: 'info',
    title: 'Dầu Brent -7% về $72/thùng sau quyết định tăng sản lượng của OPEC+',
    impact: 'Chi phí vận chuyển & năng lượng giảm. Lạm phát VN hạ nhiệt, hỗ trợ NHNN giữ lãi suất.',
    summary:
      'OPEC+ đồng thuận tăng sản lượng 500,000 thùng/ngày từ tháng 4/2026. '
      + 'Dầu Brent giảm từ $77.5 về $72/thùng. '
      + 'Hưởng lợi: HVN, VJC (hàng không), DPM, DCM (phân bón), các công ty logistics. '
      + 'Chịu thiệt: GAS, PVD, PVS (dầu khí). '
      + 'Tác động vĩ mô VN: CPI tháng 3 có thể thấp hơn dự báo, hỗ trợ NHNN không tăng lãi suất.',
    aiPrompt:
      'Dầu Brent vừa giảm 7% về $72/thùng sau quyết định OPEC+ tăng sản lượng. '
      + 'Trong danh mục tôi có cổ phiếu thuộc nhiều ngành khác nhau. '
      + 'Hãy phân tích tác động hai chiều: (1) Ngành nào hưởng lợi và ngành nào chịu thiệt khi dầu giảm? '
      + '(2) Dầu thấp hơn ảnh hưởng thế nào đến lạm phát VN và quyết định lãi suất của NHNN? '
      + '(3) Đây có phải thời điểm tốt để cân nhắc mua cổ phiếu hàng không (HVN, VJC) '
      + 'như một cơ hội tactical trong ngắn hạn không?',
    timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000),
    read: true,
  },
];
