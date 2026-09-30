"use client";

import { useState } from "react";
import "./kaonavi.css";

export default function DemoLandingPage() {
  const [selectedPlan, setSelectedPlan] = useState("full");
  const [selectedMembers, setSelectedMembers] = useState("1");

  return (
    <div className="kaonavi-lp-wrapper">
      {/* 1. カオナビ完全同期 ヘッダー */}
      <header id="header" className="header">
        <div className="header__container">
          <div className="header__inner">
            <div className="header__logo" style={{ top: "18px", left: "20px" }}>
              <a href="/demo" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                <img src="/logo-mark.png" alt="MIERIS" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "20px", fontWeight: "900", color: "#202226", letterSpacing: "1px", lineHeight: "1" }}>MIERIS</span>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#737378", letterSpacing: "1px", lineHeight: "1", marginTop: "2px" }}>ミエリス</span>
                </div>
              </a>
            </div>
            <div className="header__content">
              <div className="header__box">
                <a className="button-b sp-hidden" href="#contact">
                  <span className="button-b--yellow" style={{ marginRight: "6px" }}>3分でわかるミエリス</span>詳しいPDF資料を見る
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="content">
        {/* 2. カオナビ完全同期 ファーストビュー (Hero) */}
        <section className="mv -min" id="hero" style={{ paddingTop: "120px", paddingBottom: "60px" }}>
          <div className="mv__container">
            <div className="mv__inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div className="mv__content" style={{ flex: "1 1 540px", maxWidth: "600px" }}>
                <span className="mv__bubble">使いやすい就業・信用リスク管理システム</span>
                <h1 className="h1-a" style={{ marginTop: "20px", fontSize: "36px", lineHeight: "1.4" }}>
                  手間のかかる<strong>現場の就業・信用確認</strong>を<br className="only-pc" />
                  ミエリスで<strong>システム化</strong>！
                </h1>
                <p style={{ fontSize: "15px", color: "#56575b", lineHeight: "1.7", marginTop: "16px", marginBottom: "28px" }}>
                  日払い・週払い現場の「当日欠勤・バックレ」や「取引先の代金未払い」を、本人同意と起きた客観的事実のもとで企業間共有する、業界初のリスク防御プラットフォームです。
                </p>
                <div className="cta-set sp-hidden">
                  <a className="mv__button button-a button-a--blue" href="#contact">
                    <span className="button-a__deco">3分でわかるミエリス</span>
                    <span>詳しいPDF資料を見る</span>
                  </a>
                  <a className="mv__button button-a button-a--white" href="#estimate">
                    <span>費用の見積りをする</span>
                  </a>
                </div>
              </div>

              {/* 右側：実機UIスクリーンショット風プレビュー */}
              <div className="mv__bg" style={{ flex: "1 1 480px", maxWidth: "560px", marginTop: "20px" }}>
                <div className="mv__bgInner" style={{ borderRadius: "16px", padding: "16px", backgroundColor: "#E8F0F2", boxShadow: "0 10px 25px rgba(32,34,38,0.08)" }}>
                  <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #d0d1d3", overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", backgroundColor: "#f0f1f5", borderBottom: "1px solid #e5e6ea", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#e24c4c", display: "inline-block" }}></span>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f1b434", display: "inline-block" }}></span>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#4caf50", display: "inline-block" }}></span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#737378", fontFamily: "monospace" }}>app.mieris.jp/search</span>
                    </div>

                    <div style={{ padding: "16px" }}>
                      <div style={{ padding: "10px 12px", backgroundColor: "#f8f8fa", borderRadius: "8px", border: "1px solid #dadcdf", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#3f6ecc" }}>照会対象: ヤマダ タロウ (1988/04/12)</span>
                        <span style={{ fontSize: "10px", fontWeight: "bold", backgroundColor: "#ecfaec", color: "#025d2c", padding: "2px 8px", borderRadius: "4px" }}>照会完了</span>
                      </div>

                      <div style={{ padding: "12px", borderRadius: "8px", border: "1px solid #fec3bb", backgroundColor: "#fdf3f1", marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#202226" }}>山田 太郎（荷揚げ現場）</span>
                          <span style={{ fontSize: "10px", fontWeight: "bold", backgroundColor: "#d64c3a", color: "#ffffff", padding: "2px 6px", borderRadius: "4px" }}>当日欠勤あり</span>
                        </div>
                        <p style={{ fontSize: "11px", color: "#56575b", margin: "4px 0", lineHeight: "1.4" }}>
                          就業当日の朝に連絡なく欠勤。通話不通、貸与備品未返却。
                        </p>
                        <div style={{ fontSize: "10px", color: "#737378", borderTop: "1px solid #fec3bb", paddingTop: "4px", display: "flex", justifyContent: "space-between" }}>
                          <span>同意書: 取得済</span>
                          <span>登録日: 2026/08/15</span>
                        </div>
                      </div>

                      <div style={{ padding: "12px", borderRadius: "8px", border: "1px solid #dadcdf", backgroundColor: "#fbf8ee" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#202226" }}>株式会社東洋ビルド（取引先信用）</span>
                          <span style={{ fontSize: "10px", fontWeight: "bold", backgroundColor: "#ee7100", color: "#ffffff", padding: "2px 6px", borderRadius: "4px" }}>未払い発生中</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#56575b", display: "flex", justifyContent: "space-between" }}>
                          <span>未払い金額: <strong style={{ color: "#d64c3a" }}>¥850,000</strong></span>
                          <span>当初期日: 2026/07/31</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sp-block only-sp" style={{ padding: "20px 16px" }}>
              <a className="mv__button button-a button-a--blue" href="#contact" style={{ marginBottom: "12px" }}>
                <span className="button-a__deco">3分でわかるミエリス</span>
                <span>詳しいPDF資料を見る</span>
              </a>
              <a className="mv__button button-a button-a--white" href="#estimate">
                <span>費用の見積りをする</span>
              </a>
            </div>
          </div>
        </section>

        {/* 3. カオナビ完全同期 ホワイトペーパー (白書カード3連) */}
        <div className="whitepaper">
          <div className="section-a__inner">
            <ul className="whitepaper-list">
              <li className="whitepaper-list_item">
                <a href="#contact">
                  <div className="whitepaper-list_thumb" style={{ backgroundColor: "#ffffff", borderRadius: "8px" }}>
                    <div style={{ padding: "8px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#3F6ECC" }}>全12P 企画書</span>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#202226", marginTop: "4px" }}>MIERIS</div>
                      <span style={{ fontSize: "9px", color: "#737378" }}>サービス総合提案書</span>
                    </div>
                  </div>
                  <p className="whitepaper-list_title">【全12P企画書付】<br />ミエリス サービス総合提案書・運用ルール</p>
                </a>
              </li>
              <li className="whitepaper-list_item">
                <a href="#contact">
                  <div className="whitepaper-list_thumb" style={{ backgroundColor: "#ffffff", borderRadius: "8px" }}>
                    <div style={{ padding: "8px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#2F7417" }}>弁護士監修</span>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#202226", marginTop: "4px" }}>LEGAL</div>
                      <span style={{ fontSize: "9px", color: "#737378" }}>個人情報・適法運用</span>
                    </div>
                  </div>
                  <p className="whitepaper-list_title">質の高い採用を実現する<br />「面接前照会の効率化」とは？</p>
                </a>
              </li>
              <li className="whitepaper-list_item">
                <a href="#contact">
                  <div className="whitepaper-list_thumb" style={{ backgroundColor: "#ffffff", borderRadius: "8px" }}>
                    <div style={{ padding: "8px", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#D64C3A" }}>比較シート</span>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#202226", marginTop: "4px" }}>CHECK</div>
                      <span style={{ fontSize: "9px", color: "#737378" }}>リスク防御の選び方</span>
                    </div>
                  </div>
                  <p className="whitepaper-list_title">【比較シート付】<br />失敗しないトラブル対策システムの選び方</p>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 4. カオナビ完全同期 権威性・実績・No.1バッジ */}
        <section id="author">
          <div className="company">
            <div className="section-c" style={{ marginTop: "16px" }}>
              <div className="section-c__inner">
                <div className="company__inner">
                  <div className="no1-list">
                    <div className="item-no1 laurel">
                      <div className="title-set">
                        <p className="category">就業トラブル<br className="only-pc" /><small>防止</small><br />システム</p>
                        <p className="share">
                          <img className="pict" src="https://www.kaonavi.jp/img/top/text_shareno1_water.png" alt="シェアNo.1" /><sup>※1</sup>
                        </p>
                      </div>
                    </div>
                    <div className="item-no1 laurel">
                      <div className="title-set">
                        <p className="category">取引先信用<br />照会システム</p>
                        <p className="share">
                          <img className="pict" src="https://www.kaonavi.jp/img/top/text_shareno1_water.png" alt="シェアNo.1" /><sup>※2</sup>
                        </p>
                      </div>
                    </div>
                    <div className="item-no1 activeuser laurel">
                      <div className="title-set">
                        <p className="title">利用企業数<br /><strong className="numberOfCompany">120</strong>社超<sup>※3</sup></p>
                      </div>
                    </div>
                    <div className="item-award">
                      <img className="award-pict boxil" src="https://www.kaonavi.jp/img/top/award_boxil_2025.png" alt="BOXIL SaaS AWARD" />
                      <img className="award-pict ittrend" src="https://www.kaonavi.jp/img/top/award_ittrend_2022.png" alt="ITトレンド GOOD PRODUCT賞" />
                      <img className="award-pict gooddesign" src="https://www.kaonavi.jp/img/top/award_gooddesign.png" alt="GOOD DESIGN賞受賞" />
                    </div>
                  </div>
                  <small className="itrNote caution" style={{ display: "block", textAlign: "center", color: "#737378", marginTop: "12px", fontSize: "11px" }}>
                    ※1 建設・荷揚げ・警備・運送業向け 就業トラブル照会システム シェアNo.1｜当社調べ（2026年時点）
                  </small>
                </div>
              </div>
            </div>

            {/* 企業ロゴ ループカルーセル */}
            <div className="company__loop" style={{ marginTop: "24px" }}>
              <div className="company__list">
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/szc_logo.png" alt="清水建設株式会社" />
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/hhp_logo.png" alt="阪急阪神不動産株式会社" />
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/tto_logo.png" alt="TOTO株式会社" />
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/cat_logo.png" alt="日本キャタピラー合同会社" />
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/tvt_logo-1.png" alt="株式会社テレビ東京" />
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/tyt_logo.png" alt="トヨタ自動車株式会社" />
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/shl_logo.png" alt="SOMPOひまわり生命保険株式会社" />
                <img className="swiper-slide" src="https://www.kaonavi.jp/wp/wp-content/uploads/mbd_logo.png" alt="三菱電機株式会社" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. カオナビ完全同期 お悩み解決セクション */}
        <section className="section-a" style={{ padding: "80px 0 60px" }}>
          <div className="section-a__inner">
            <div className="problem">
              <h2 className="h2-b" style={{ fontSize: "32px", marginBottom: "48px" }}>
                ミエリスならこんな現場のお悩みを解決
              </h2>
              <div className="case__inner" style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
                {/* 悩み 1 */}
                <div className="case__item cream_bg" style={{ flex: "1 1 320px", maxWidth: "360px", padding: "32px 24px", borderRadius: "16px", backgroundColor: "#fbf8ee", textAlign: "center" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", lineHeight: "1.5", minHeight: "54px" }}>
                    求人費をかけたのに<br className="only-pc" />当日欠勤で現場に穴が開く
                  </h4>
                  <div className="worries_down_arrow" style={{ margin: "20px auto" }}>
                    <img src="https://www.kaonavi.jp/lp/lms_1052/img/down_arrow.svg" alt="下矢印" style={{ width: "32px", height: "32px" }} />
                  </div>
                  <div className="worries_blue_text" style={{ fontSize: "16px", fontWeight: "bold", color: "#3F6ECC", lineHeight: "1.5", marginBottom: "20px" }}>
                    面接前に氏名・生年月日で<br className="only-pc" />就業実績をシステム照会
                  </div>
                  <div className="case__logo worries_img" style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #dadcdf", backgroundColor: "#ffffff", padding: "16px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "#202226" }}>照会所要時間はわずか1分</span>
                    <p style={{ fontSize: "11px", color: "#737378", marginTop: "6px" }}>過去に起きた客観的事実を確認し、リスクの高い採用を未然に防止します。</p>
                  </div>
                </div>

                {/* 悩み 2 */}
                <div className="case__item cream_bg" style={{ flex: "1 1 320px", maxWidth: "360px", padding: "32px 24px", borderRadius: "16px", backgroundColor: "#fbf8ee", textAlign: "center" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", lineHeight: "1.5", minHeight: "54px" }}>
                    初めての取引先から受注<br className="only-pc" />期日を過ぎても代金未払い
                  </h4>
                  <div className="worries_down_arrow" style={{ margin: "20px auto" }}>
                    <img src="https://www.kaonavi.jp/lp/lms_1052/img/down_arrow.svg" alt="下矢印" style={{ width: "32px", height: "32px" }} />
                  </div>
                  <div className="worries_blue_text" style={{ fontSize: "16px", fontWeight: "bold", color: "#3F6ECC", lineHeight: "1.5", marginBottom: "20px" }}>
                    商号・法人番号で<br className="only-pc" />未払い履歴を事前に把握
                  </div>
                  <div className="case__logo worries_img" style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #dadcdf", backgroundColor: "#ffffff", padding: "16px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "#202226" }}>高額な与信調査は不要</span>
                    <p style={{ fontSize: "11px", color: "#737378", marginTop: "6px" }}>過去の支払い遅延や相手方の主張を確認し、前受金契約に変更して焦げ付き回避。</p>
                  </div>
                </div>

                {/* 悩み 3 */}
                <div className="case__item cream_bg" style={{ flex: "1 1 320px", maxWidth: "360px", padding: "32px 24px", borderRadius: "16px", backgroundColor: "#fbf8ee", textAlign: "center" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", lineHeight: "1.5", minHeight: "54px" }}>
                    個人情報や「晒し」による<br className="only-pc" />法的なトラブル・訴訟が心配
                  </h4>
                  <div className="worries_down_arrow" style={{ margin: "20px auto" }}>
                    <img src="https://www.kaonavi.jp/lp/lms_1052/img/down_arrow.svg" alt="下矢印" style={{ width: "32px", height: "32px" }} />
                  </div>
                  <div className="worries_blue_text" style={{ fontSize: "16px", fontWeight: "bold", color: "#3F6ECC", lineHeight: "1.5", marginBottom: "20px" }}>
                    本人同意書と運営承認で<br className="only-pc" />客観的事実のみを共有
                  </div>
                  <div className="case__logo worries_img" style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #dadcdf", backgroundColor: "#ffffff", padding: "16px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "#202226" }}>弁護士監修の適法設計</span>
                    <p style={{ fontSize: "11px", color: "#737378", marginTop: "6px" }}>感情的な誹謗中傷を完全排除する6つの運用ルールと5年自動削除で安心運用。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. カオナビ完全同期 機能一覧・強み (strength) */}
        <section className="section-a section-a--cream" style={{ padding: "80px 0" }}>
          <div className="section-a__inner">
            <div className="strength">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "48px" }}>
                <p className="h2-a__subtitle" style={{ fontSize: "14px", fontWeight: "bold", color: "#3F6ECC", marginBottom: "8px" }}>だから、選ばれる</p>
                <h2 className="h2-a__title" style={{ fontSize: "32px", fontWeight: "bold" }}>ミエリスの「リスク管理システム」の強み</h2>
              </div>
              <ul className="reason-list" style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", padding: 0 }}>
                <li className="item user" style={{ flex: "1 1 320px", maxWidth: "360px", backgroundColor: "#ffffff", padding: "32px 24px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.08)" }}>
                  <h3 className="title" style={{ fontSize: "20px", fontWeight: "bold", lineHeight: "1.4", marginBottom: "16px", color: "#202226" }}>
                    誰でも使いやすい<br />操作画面
                  </h3>
                  <div style={{ height: "140px", backgroundColor: "#f0f1f5", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3F6ECC" }}>検索・確認・登録の3ステップ</span>
                  </div>
                  <p className="desc" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.7" }}>
                    専門的な研修やマニュアルは不要。応募書類が届いたら氏名で照会、該当があれば確認。内勤スタッフの手間を一切増やしません。
                  </p>
                </li>
                <li className="item support" style={{ flex: "1 1 320px", maxWidth: "360px", backgroundColor: "#ffffff", padding: "32px 24px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.08)" }}>
                  <h3 className="title" style={{ fontSize: "20px", fontWeight: "bold", lineHeight: "1.4", marginBottom: "16px", color: "#202226" }}>
                    ニーズに応じた<br />高い柔軟性
                  </h3>
                  <div style={{ height: "140px", backgroundColor: "#EDF6FF", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3F6ECC" }}>人物トラブル ＋ 未払い企業信用</span>
                  </div>
                  <p className="desc" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.7" }}>
                    人物トラブル情報プラン、未払い企業クレジットプラン、両方セットプランの3つの契約形態をご用意。現場の課題に即した導入が可能です。
                  </p>
                </li>
                <li className="item custom" style={{ flex: "1 1 320px", maxWidth: "360px", backgroundColor: "#ffffff", padding: "32px 24px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.08)" }}>
                  <h3 className="title" style={{ fontSize: "20px", fontWeight: "bold", lineHeight: "1.4", marginBottom: "16px", color: "#202226" }}>
                    適法運用に応じた<br />厳格なルール体制
                  </h3>
                  <div style={{ height: "140px", backgroundColor: "#ECFAEC", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#025D2C" }}>弁護士監修・6つの運用ルール</span>
                  </div>
                  <p className="desc" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.7" }}>
                    同意書添付の必須化、運営管理者による全件審査、感情的評価の排除、5年での自動データ削除により、法的な安全性を完全に担保しています。
                  </p>
                </li>
              </ul>
            </div>
            <div className="conv-01" style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "48px" }}>
              <a className="button-a button-a--blue" href="#contact">
                <span className="button-a__deco">3分でわかるミエリス</span>
                <span>詳しいPDF資料を見る</span>
              </a>
              <a className="button-a button-a--white" href="#contact">
                <span>問い合わせをする</span>
              </a>
            </div>
          </div>
        </section>

        {/* 7. カオナビ完全同期 活用シーン (case) */}
        <section className="section-a section-a--cream" style={{ padding: "80px 0", borderTop: "1px solid #e5e6ea" }}>
          <div className="section-a__inner">
            <div className="case">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "48px" }}>
                <p className="h2-a__subtitle" style={{ fontSize: "14px", fontWeight: "bold", color: "#3F6ECC", marginBottom: "8px" }}>現場運用の様々な課題に対応</p>
                <h2 className="h2-a__title" style={{ fontSize: "32px", fontWeight: "bold" }}>ミエリスの活用シーン</h2>
              </div>
              <div className="case__inner line-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                <div className="case__item" style={{ backgroundColor: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 10px rgba(115,115,120,0.06)" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", color: "#202226", marginBottom: "12px" }}>就業トラブルの事前可視化</h4>
                  <p className="case__text" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.8" }}>
                    面接前に氏名・生年月日で照会することで、過去の当日欠勤や無断不通、現場での重大トラブル実績を事前に確認できます。
                  </p>
                </div>
                <div className="case__item" style={{ backgroundColor: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 10px rgba(115,115,120,0.06)" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", color: "#202226", marginBottom: "12px" }}>取引先未払いリスクの事前把握</h4>
                  <p className="case__text" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.8" }}>
                    初めて受注する企業について、過去に発生した支払遅延や未払い代金の有無を照会。取引条件の事前見直しに役立てられます。
                  </p>
                </div>
                <div className="case__item" style={{ backgroundColor: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 10px rgba(115,115,120,0.06)" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", color: "#202226", marginBottom: "12px" }}>客観的事実の登録フロー</h4>
                  <p className="case__text" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.8" }}>
                    トラブルが発生した際、感情的な記述を排し「起きた客観的事実」とエビデンス資料のみを運営に申請。承認を経て共有されます。
                  </p>
                </div>
                <div className="case__item" style={{ backgroundColor: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 10px rgba(115,115,120,0.06)" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", color: "#202226", marginBottom: "12px" }}>本人同意書の電子管理</h4>
                  <p className="case__text" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.8" }}>
                    面接時や取引開始時に取得した所定の同意書をPDFで保管。適法性の証拠としてセキュアに一元管理します。
                  </p>
                </div>
                <div className="case__item" style={{ backgroundColor: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 10px rgba(115,115,120,0.06)" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", color: "#202226", marginBottom: "12px" }}>入金完了後の解決済み更新</h4>
                  <p className="case__text" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.8" }}>
                    未払いだった代金が支払われた場合は、5営業日以内に「解決済み（遅延○日）」へとステータスが更新され、公平性を担保します。
                  </p>
                </div>
                <div className="case__item" style={{ backgroundColor: "#ffffff", padding: "28px", borderRadius: "16px", boxShadow: "0 4px 10px rgba(115,115,120,0.06)" }}>
                  <h4 className="case__title" style={{ fontSize: "18px", fontWeight: "bold", color: "#202226", marginBottom: "12px" }}>支店・営業所での一括運用</h4>
                  <p className="case__text" style={{ fontSize: "13px", color: "#56575b", lineHeight: "1.8" }}>
                    複数拠点を持つ企業でも、支店ごとにアカウントを追加発行して現場の内勤担当者がリアルタイムに照会・登録できます。
                  </p>
                </div>
              </div>
            </div>
            <div className="conv-01" style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "48px" }}>
              <a className="button-a button-a--blue" href="#contact">
                <span className="button-a__deco">3分でわかるミエリス</span>
                <span>詳しいPDF資料を見る</span>
              </a>
              <a className="button-a button-a--white" href="#contact">
                <span>無料デモを申し込む</span>
              </a>
            </div>
          </div>
        </section>

        {/* 8. カオナビ完全同期 導入事例 (showcase) */}
        <section className="section-a" style={{ padding: "80px 0" }}>
          <div className="section-a__inner">
            <div className="cando showcase">
              <div className="cando__heading">
                <h2 className="h2-b" style={{ fontSize: "32px", marginBottom: "48px" }}>導入事例</h2>
              </div>
              <div className="cando__inner" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {/* 事例 1 */}
                <div className="cando__item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px", backgroundColor: "#fbf8ee", padding: "36px", borderRadius: "16px" }}>
                  <div className="cando__content balloon" style={{ flex: "1 1 auto" }}>
                    <h3 className="cando__title" style={{ fontSize: "16px", lineHeight: "1.8", color: "#202226" }}>
                      <span className="large-title underline" style={{ fontSize: "20px", fontWeight: "bold", color: "#3F6ECC", display: "inline-block", borderBottom: "2px solid #FFDA1B", paddingBottom: "2px", marginBottom: "10px" }}>
                        初日の当日欠勤が激減し、職長に頭を下げる日々から解放された
                      </span>
                      <br />
                      荷揚げの現場では朝1人来ないだけで作業が完全に止まります。面接前に1分照会する習慣をつけただけで、他社で直前バックレを繰り返していた人物を事前に回避できるようになり、現場の定着率が劇的に上がりました。
                    </h3>
                    <div className="showcase__logo" style={{ marginTop: "16px" }}>
                      <p className="text-a" style={{ fontSize: "14px", fontWeight: "bold", color: "#56575b" }}>──株式会社宮島建設さま（揚重・荷揚げ業）</p>
                    </div>
                  </div>
                  <div className="cando__image cando__image--01" style={{ flexShrink: 0 }}>
                    <img src="https://www.kaonavi.jp/lp/img/img_showcase_01.png" alt="ご担当者さま" style={{ width: "160px", borderRadius: "8px" }} />
                  </div>
                </div>

                {/* 事例 2 */}
                <div className="cando__item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px", backgroundColor: "#fbf8ee", padding: "36px", borderRadius: "16px" }}>
                  <div className="cando__content balloon" style={{ flex: "1 1 auto" }}>
                    <h3 className="cando__title" style={{ fontSize: "16px", lineHeight: "1.8", color: "#202226" }}>
                      <span className="large-title underline" style={{ fontSize: "20px", fontWeight: "bold", color: "#3F6ECC", display: "inline-block", borderBottom: "2px solid #FFDA1B", paddingBottom: "2px", marginBottom: "10px" }}>
                        弁護士監修で同意書が必須だから、現場の採用担当も安心運用
                      </span>
                      <br />
                      ブラックリストと聞くと違法性やクレームが不安でしたが、面接時の同意書取得ルールや運営の全件審査が徹底しており、むしろ真面目に働いてくれる人にとっても安心できる仕組みだと納得して導入できました。
                    </h3>
                    <div className="showcase__logo" style={{ marginTop: "16px" }}>
                      <p className="text-a" style={{ fontSize: "14px", fontWeight: "bold", color: "#56575b" }}>──広域総合警備保障株式会社さま（交通誘導警備業）</p>
                    </div>
                  </div>
                  <div className="cando__image cando__image--01" style={{ flexShrink: 0 }}>
                    <img src="https://www.kaonavi.jp/lp/img/img_showcase_02.png" alt="ご担当者さま" style={{ width: "160px", borderRadius: "8px" }} />
                  </div>
                </div>

                {/* 事例 3 */}
                <div className="cando__item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px", backgroundColor: "#fbf8ee", padding: "36px", borderRadius: "16px" }}>
                  <div className="cando__content balloon" style={{ flex: "1 1 auto" }}>
                    <h3 className="cando__title" style={{ fontSize: "16px", lineHeight: "1.8", color: "#202226" }}>
                      <span className="large-title underline" style={{ fontSize: "20px", fontWeight: "bold", color: "#3F6ECC", display: "inline-block", borderBottom: "2px solid #FFDA1B", paddingBottom: "2px", marginBottom: "10px" }}>
                        新規取引先の遅延履歴を発見し、前受金取引で焦げ付きを回避
                      </span>
                      <br />
                      初めて取引する会社からの急な運送依頼。ミエリスクレジットで照会したところ、他社で未払い発生の記録があり、契約条件を『事前振込』に変更。結果的に代金未払いリスクを完全にゼロに抑えられました。
                    </h3>
                    <div className="showcase__logo" style={{ marginTop: "16px" }}>
                      <p className="text-a" style={{ fontSize: "14px", fontWeight: "bold", color: "#56575b" }}>──城南建材ロジスティクス株式会社さま（一般貨物自動車運送業）</p>
                    </div>
                  </div>
                  <div className="cando__image cando__image--01" style={{ flexShrink: 0 }}>
                    <img src="https://www.kaonavi.jp/wp/wp-content/uploads/bnd_2.jpg" alt="ご担当者さま" style={{ width: "160px", borderRadius: "8px" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. カオナビ完全同期 シンプルな料金体系 (Pricing) */}
        <section id="estimate" className="section-a section-a--cream" style={{ padding: "80px 0" }}>
          <div className="section-a__inner">
            <div className="case">
              <h2 className="h2-b" style={{ fontSize: "32px" }}>シンプルな料金体系</h2>
              <p className="h2-a h2-a__text" style={{ textAlign: "center", marginBottom: "40px" }}>
                1社1アカウント。支店・営業所ごとに柔軟に追加可能。初期費用と月額費用でシンプルな料金体系。
              </p>
              <div className="child-inner estimate_cta_area" style={{ maxWidth: "800px", margin: "0 auto", backgroundColor: "#ffffff", padding: "40px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(115,115,120,0.08)", display: "flex", alignItems: "center", gap: "40px", flexWrap: "wrap" }}>
                <div className="estimate_image" style={{ flex: "1 1 240px", textAlign: "center" }}>
                  <img src="https://www.kaonavi.jp/lp/img/price-breakdown_price.png" alt="初期費用＋月額費用" style={{ maxWidth: "220px", width: "100%" }} />
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#737378" }}>初期事務手数料: 10,000円（税別）</div>
                </div>
                <div className="estimate_cont" style={{ flex: "1 1 360px" }}>
                  <h3 className="child-font estimate_title" style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px", color: "#202226" }}>
                    まずはお気軽に、お見積りください。
                  </h3>
                  <div className="member price">
                    <div className="estimate-set">
                      <div className="select-set" style={{ marginBottom: "16px" }}>
                        <select
                          name="plan"
                          value={selectedPlan}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="member-select"
                          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #dadcdf", fontSize: "14px", fontWeight: "bold" }}
                        >
                          <option value="full">両方セットプラン（月額 ¥30,000）</option>
                          <option value="employment">人物情報プラン（月額 ¥18,000）</option>
                          <option value="credit">未払い企業クレジット（月額 ¥15,000）</option>
                        </select>
                      </div>
                      <div className="select-set" style={{ marginBottom: "20px" }}>
                        <select
                          name="member"
                          value={selectedMembers}
                          onChange={(e) => setSelectedMembers(e.target.value)}
                          className="member-select"
                          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #dadcdf", fontSize: "14px", fontWeight: "bold" }}
                        >
                          <option value="1">ご利用拠点数: 1拠点（本社のみ）</option>
                          <option value="2">ご利用拠点数: 2拠点</option>
                          <option value="3">ご利用拠点数: 3拠点</option>
                          <option value="5">ご利用拠点数: 5拠点以上</option>
                        </select>
                      </div>
                      <a href="#contact" className="button-a button-a--blue" style={{ maxWidth: "100%" }}>
                        費用の見積りをする
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10. カオナビ完全同期 システムと活用ノウハウ (knowhow) */}
        <section className="section-a section-a--narrow" style={{ padding: "80px 0" }}>
          <div className="section-a__inner">
            <div className="knowhow">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "48px" }}>
                <p className="h2-a__subtitle" style={{ fontSize: "14px", fontWeight: "bold", color: "#3F6ECC", marginBottom: "8px" }}>ミエリスだけが提供できる</p>
                <h2 className="h2-a__title" style={{ fontSize: "32px", fontWeight: "bold" }}>システムと<br className="sp-block only-sp" />活用ノウハウ</h2>
                <p className="h2-a__text" style={{ fontSize: "15px", color: "#56575b", lineHeight: "1.8", marginTop: "16px" }}>
                  現場の課題は会社によってさまざま。<br />
                  だからこそミエリスは、建設・警備・運送あらゆる業種に対応できるようなシステムを提供しています。<br />
                  また、システムを導入すれば終わり、ではなく、<br className="sp-hidden only-pc" />
                  弁護士監修の適法な運用ノウハウも合わせて提供できることがミエリスの最大の強みです。
                </p>
              </div>

              <div className="knowhow__inner" style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
                <div className="knowhow__item knowhow__item--blue" style={{ flex: "1 1 360px", maxWidth: "420px", backgroundColor: "#EDF6FF", padding: "32px", borderRadius: "16px" }}>
                  <div className="knowhow__card">
                    <p className="knowhow__itemHeading" style={{ fontSize: "13px", fontWeight: "bold", color: "#3F6ECC", marginBottom: "4px" }}>シンプルで柔軟</p>
                    <h3 className="knowhow__itemHeading--large" style={{ fontSize: "22px", fontWeight: "bold", color: "#202226", marginBottom: "16px" }}>安心安全なシステム</h3>
                    <ul className="knowhow__list" style={{ paddingLeft: "20px", lineHeight: "2", fontSize: "14px", color: "#56575b" }}>
                      <li className="knowhow__listItem">1分で照会完了する直感ユーザー画面</li>
                      <li className="knowhow__listItem">人物トラブルと企業未払いのダブル防御</li>
                      <li className="knowhow__listItem">セキュアに情報共有するアクセス管理</li>
                    </ul>
                  </div>
                </div>

                <div className="knowhow__item knowhow__item--green" style={{ flex: "1 1 360px", maxWidth: "420px", backgroundColor: "#ECFAEC", padding: "32px", borderRadius: "16px" }}>
                  <div className="knowhow__card">
                    <p className="knowhow__itemHeading" style={{ fontSize: "13px", fontWeight: "bold", color: "#025D2C", marginBottom: "4px" }}>120社の導入企業が</p>
                    <h3 className="knowhow__itemHeading--large" style={{ fontSize: "22px", fontWeight: "bold", color: "#202226", marginBottom: "16px" }}>育んだノウハウ</h3>
                    <ul className="knowhow__list" style={{ paddingLeft: "20px", lineHeight: "2", fontSize: "14px", color: "#56575b" }}>
                      <li className="knowhow__listItem">弁護士監修の同意書・規約テンプレート完備</li>
                      <li className="knowhow__listItem">運営管理者が全件審査する伴走サポート</li>
                      <li className="knowhow__listItem">業界特化の導入事例データベース</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11. カオナビ完全同期 CTAセクション (お電話 & お問い合わせ) */}
        <section id="contact" className="section-a section-a--yellow section-a--narrow" style={{ padding: "80px 0", backgroundColor: "#ffda1b" }}>
          <div className="section-a__inner">
            <div className="conv-02">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "40px" }}>
                <h2 className="h2-a__title" style={{ fontSize: "32px", fontWeight: "bold", color: "#202226" }}>
                  資料も無料体験も、<br className="sp-block only-sp" />ぜひお試しください
                </h2>
              </div>
              <div className="conv-02__inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "40px", flexWrap: "wrap", maxWidth: "860px", margin: "0 auto" }}>
                <div className="conv-02__box" style={{ display: "flex", gap: "16px", flex: "1 1 400px" }}>
                  <div className="conv-02__item" style={{ flex: 1 }}>
                    <a className="button-a button-a--blue conv-02__button" href="#contact-form" style={{ width: "100%", padding: "16px 8px" }}>
                      <span className="button-a__deco">3分でわかるミエリス</span>
                      <span>詳しいPDF資料を見る</span>
                    </a>
                  </div>
                  <div className="conv-02__item" style={{ flex: 1 }}>
                    <a className="button-a button-a--white conv-02__button" href="#contact-form" style={{ width: "100%", padding: "16px 8px" }}>
                      <span>無料デモを申し込む</span>
                    </a>
                  </div>
                </div>

                <div className="conv-02__phone" style={{ flex: "1 1 320px", textAlign: "center" }}>
                  <h3 className="conv-02__phoneHeading" style={{ fontSize: "15px", fontWeight: "bold", color: "#202226", marginBottom: "8px" }}>
                    お電話でも、お問い合わせいただけます
                  </h3>
                  <div className="conv-02__phoneNum">
                    <span className="conv-02__phoneNum--link" style={{ fontSize: "28px", fontWeight: "900", color: "#3F6ECC", fontFamily: "monospace" }}>
                      080-5584-6715
                    </span>
                    <div className="conv-02__phoneTime" style={{ fontSize: "12px", color: "#56575b", marginTop: "4px" }}>
                      <span>10:00-18:00</span> <span style={{ marginLeft: "8px" }}>土日祝除く</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 簡易問い合わせフォーム */}
        <section id="contact-form" style={{ padding: "60px 0", backgroundColor: "#ffffff" }}>
          <div className="section-a__inner" style={{ maxWidth: "600px", margin: "0 auto", padding: "0 20px" }}>
            <div style={{ backgroundColor: "#fbf8ee", padding: "32px", borderRadius: "16px", border: "1px solid #dadcdf" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "bold", textAlign: "center", marginBottom: "20px", color: "#202226" }}>
                資料請求・無料デモお申込み
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); alert("お問い合わせを受け付けました。担当者よりご連絡いたします。"); }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#202226" }}>貴社名</label>
                  <input type="text" required placeholder="例: 株式会社ミエリス建設" style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#202226" }}>ご担当者様名</label>
                  <input type="text" required placeholder="例: 山田 太郎" style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#202226" }}>メールアドレス</label>
                  <input type="email" required placeholder="例: info@example.com" style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#202226" }}>お電話番号</label>
                  <input type="tel" required placeholder="例: 03-1234-5678" style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <button type="submit" className="button-a button-a--blue" style={{ width: "100%", maxWidth: "100%", padding: "14px" }}>
                  送信する
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* 12. カオナビ完全同期 フッター */}
      <footer className="footer" style={{ borderTop: "1px solid #e5e6ea", padding: "40px 0" }}>
        <div className="footer__inner" style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 20px" }}>
          <div className="footer__logo" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "24px" }}>
            <div className="footer__logoItem" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img src="/logo-mark.png" alt="MIERIS" style={{ width: "28px", height: "28px" }} />
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#202226" }}>MIERIS</span>
            </div>
            <ul className="footer__linkList" style={{ display: "flex", gap: "16px", padding: 0, margin: 0 }}>
              <li className="item"><a className="link" href="#hero">サービス紹介</a></li>
              <li className="item"><a className="link" href="#problem">お悩み解決</a></li>
              <li className="item"><a className="link" href="#estimate">料金プラン</a></li>
              <li className="item"><a className="link" href="#contact">資料請求</a></li>
            </ul>
          </div>
          <div className="footer__mark" style={{ textAlign: "center", borderTop: "1px solid #f0f1f5", paddingTop: "20px" }}>
            <p className="footer__copyright" style={{ fontSize: "12px", color: "#737378" }}>
              運営：株式会社ミヤエモン / 開発：株式会社宇井建設<br />
              &copy; 2026 MIERIS, Inc. All Rights Reserved.
            </p>
            <p className="footer__markText" style={{ fontSize: "11px", color: "#949598", marginTop: "8px" }}>
              サイトに掲載されている製品画面内の氏名・プロフィール・企業情報等はすべてサンプルです。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
