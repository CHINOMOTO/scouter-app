"use client";

import { useState, useEffect } from "react";
import "./kaonavi.css";

export default function DemoLandingPage() {
  const [selectedPlan, setSelectedPlan] = useState("full");
  const [selectedMembers, setSelectedMembers] = useState("1");

  // スクロール時に要素がふわっと浮き上がるアニメーション (uiken.jpスタイル)
  useEffect(() => {
    const targets = document.querySelectorAll(".scroll-fade, .scroll-fade-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -60px 0px",
        threshold: 0.1,
      }
    );

    targets.forEach((target) => observer.observe(target));

    return () => {
      targets.forEach((target) => observer.unobserve(target));
    };
  }, []);

  return (
    <div className="kaonavi-lp-wrapper" style={{ overflowX: "hidden", width: "100%", maxWidth: "100vw", position: "relative" }}>
      {/* 1. カオナビ完全同期 ヘッダー */}
      <header id="header" className="header">
        <div className="header__container">
          <div className="header__inner">
            <div className="header__logo" style={{ top: "16px", left: "24px" }}>
              <a href="/demo" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                <img src="/logo-mark.png" alt="MIERIS" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "22px", fontWeight: "900", color: "#202226", letterSpacing: "1.5px", lineHeight: "1" }}>MIERIS</span>
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

      <div className="content" style={{ overflowX: "hidden", width: "100%", maxWidth: "100vw" }}>
        {/* 2. カオナビ完全同期 ファーストビュー (Hero) */}
        <section className="mv -min" id="hero" style={{ paddingTop: "130px", paddingBottom: "60px", overflow: "hidden" }}>
          <div className="mv__container">
            <div className="mv__inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
              
              {/* 左側コピー */}
              <div className="mv__content" style={{ flex: "1 1 300px", maxWidth: "520px", width: "100%", minWidth: 0 }}>
                <span className="mv__bubble" style={{ fontSize: "14px", fontWeight: "bold", padding: "6px 18px" }}>
                  使いやすい就業・信用リスク管理システム
                </span>
                
                <h1 className="h1-a" style={{ marginTop: "20px", fontSize: "35px", lineHeight: "1.45", letterSpacing: "-0.5px" }}>
                  手間のかかる<br />
                  <strong>現場の就業・信用確認</strong>を<br />
                  ミエリスで<strong>システム化</strong>！
                </h1>

                <p style={{ fontSize: "16px", color: "#56575b", lineHeight: "1.8", marginTop: "20px", marginBottom: "36px" }}>
                  日払い・週払い現場の<strong>「当日欠勤・バックレ」</strong>や、<br className="only-pc" />
                  初めての取引先による<strong>「代金未払い・入金遅延」</strong>を、<br className="only-pc" />
                  本人同意と客観的事実のもとで企業間共有する業界初インフラです。
                </p>

                <div className="cta-set sp-hidden" style={{ display: "flex", gap: "16px", marginTop: "0" }}>
                  <a className="mv__button button-a button-a--blue" href="#contact" style={{ padding: "18px 24px" }}>
                    <span className="button-a__deco">3分でわかるミエリス</span>
                    <span style={{ fontSize: "16px" }}>詳しいPDF資料を見る</span>
                  </a>
                  <a className="mv__button button-a button-a--white" href="#estimate" style={{ padding: "18px 24px" }}>
                    <span style={{ fontSize: "16px" }}>費用の見積りをする</span>
                  </a>
                </div>
              </div>

              {/* 右側：生成した高品質ノートPCモックアップ写真 */}
              <div className="mv__bg" style={{ flex: "1 1 300px", maxWidth: "540px", width: "100%", minWidth: 0 }}>
                <div className="mv__bgInner" style={{ borderRadius: "20px", overflow: "hidden", backgroundColor: "#E8F0F2", boxShadow: "0 12px 30px rgba(32,34,38,0.12)" }}>
                  <img
                    src="/demo-assets/hero-laptop.jpg"
                    alt="ミエリス 操作画面"
                    style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
                  />
                </div>
              </div>

            </div>

            {/* スマホ用ボタン */}
            <div className="sp-block only-sp" style={{ padding: "24px 16px 0" }}>
              <a className="mv__button button-a button-a--blue" href="#contact" style={{ marginBottom: "14px", width: "100%", padding: "16px" }}>
                <span className="button-a__deco">3分でわかるミエリス</span>
                <span style={{ fontSize: "15px" }}>詳しいPDF資料を見る</span>
              </a>
              <a className="mv__button button-a button-a--white" href="#estimate" style={{ width: "100%", padding: "16px" }}>
                <span style={{ fontSize: "15px" }}>費用の見積りをする</span>
              </a>
            </div>
          </div>
        </section>

        {/* 3. カオナビ完全同期 ホワイトペーパー (白書カード3連) */}
        <div className="whitepaper scroll-fade-up" style={{ margin: "24px 0 40px" }}>
          <div className="section-a__inner">
            <ul className="whitepaper-list">
              
              <li className="whitepaper-list_item">
                <a href="#contact">
                  <div className="whitepaper-list_thumb">
                    <img
                      src="/demo-assets/wp-proposal.jpg"
                      alt="ミエリス サービス総合提案書"
                      style={{ width: "135px", height: "92px", objectFit: "cover", borderRadius: "6px" }}
                    />
                  </div>
                  <p className="whitepaper-list_title" style={{ fontSize: "14px", lineHeight: "1.6" }}>
                    【全12P企画書付】<br />
                    ミエリス サービス総合提案書・運用ルール
                  </p>
                </a>
              </li>

              <li className="whitepaper-list_item">
                <a href="#contact">
                  <div className="whitepaper-list_thumb">
                    <img
                      src="/demo-assets/wp-legal.jpg"
                      alt="面接前照会の効率化ガイド"
                      style={{ width: "135px", height: "92px", objectFit: "cover", borderRadius: "6px" }}
                    />
                  </div>
                  <p className="whitepaper-list_title" style={{ fontSize: "14px", lineHeight: "1.6" }}>
                    質の高い採用を実現する<br />
                    「面接前照会の効率化」とは？
                  </p>
                </a>
              </li>

              <li className="whitepaper-list_item">
                <a href="#contact">
                  <div className="whitepaper-list_thumb">
                    <img
                      src="/demo-assets/wp-comparison.jpg"
                      alt="リスク対策システム 比較選定シート"
                      style={{ width: "135px", height: "92px", objectFit: "cover", borderRadius: "6px" }}
                    />
                  </div>
                  <p className="whitepaper-list_title" style={{ fontSize: "14px", lineHeight: "1.6" }}>
                    【比較シート付】<br />
                    失敗しないトラブル対策システムの選び方
                  </p>
                </a>
              </li>

            </ul>
          </div>
        </div>

        {/* 4. カオナビ完全同期 権威性・実績・No.1バッジ */}
        <section id="author" className="scroll-fade-up">
          <div className="company">
            <div className="section-c" style={{ marginTop: "16px" }}>
              <div className="section-c__inner">
                <div className="company__inner">
                  <div className="no1-list">
                    
                    <div className="item-no1 laurel" style={{ maxWidth: "260px", width: "100%", margin: "0 6px" }}>
                      <div className="title-set" style={{ maxWidth: "195px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        <p className="category" style={{ flex: "0 0 auto", fontSize: "13px", fontWeight: "bold", lineHeight: "1.35", textAlign: "center", textAlignLast: "center", whiteSpace: "nowrap", color: "#202226" }}>
                          就業トラブル<br />防止システム
                        </p>
                        <p className="share" style={{ margin: 0, position: "relative", flex: "0 0 96px" }}>
                          <img className="pict" src="https://www.kaonavi.jp/img/top/text_shareno1_water.png" alt="シェアNo.1" style={{ width: "96px", height: "auto", display: "block" }} />
                        </p>
                      </div>
                    </div>

                    <div className="item-no1 laurel" style={{ maxWidth: "260px", width: "100%", margin: "0 6px" }}>
                      <div className="title-set" style={{ maxWidth: "195px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        <p className="category" style={{ flex: "0 0 auto", fontSize: "13px", fontWeight: "bold", lineHeight: "1.35", textAlign: "center", textAlignLast: "center", whiteSpace: "nowrap", color: "#202226" }}>
                          取引先信用<br />照会システム
                        </p>
                        <p className="share" style={{ margin: 0, position: "relative", flex: "0 0 96px" }}>
                          <img className="pict" src="https://www.kaonavi.jp/img/top/text_shareno1_water.png" alt="シェアNo.1" style={{ width: "96px", height: "auto", display: "block" }} />
                        </p>
                      </div>
                    </div>

                    <div className="item-no1 activeuser laurel" style={{ maxWidth: "260px", width: "100%" }}>
                      <div className="title-set">
                        <p className="title">利用企業数<br /><strong className="numberOfCompany">120</strong>社超</p>
                      </div>
                    </div>

                    <div className="item-award">
                      <img className="award-pict boxil" src="https://www.kaonavi.jp/img/top/award_boxil_2025.png" alt="BOXIL SaaS AWARD" />
                      <img className="award-pict ittrend" src="https://www.kaonavi.jp/img/top/award_ittrend_2022.png" alt="ITトレンド GOOD PRODUCT賞" />
                      <img className="award-pict gooddesign" src="https://www.kaonavi.jp/img/top/award_gooddesign.png" alt="GOOD DESIGN賞受賞" />
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* 企業ロゴ ループカルーセル (完全シームレス・はみ出しゼロ仕様) */}
            <div className="company__loop" style={{ marginTop: "24px", overflow: "hidden", width: "100%", maxWidth: "100%" }}>
              <div className="company__marquee">
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
                <div className="company__list" aria-hidden="true">
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
          </div>
        </section>

        {/* 5. カオナビ完全同期 お悩み解決セクション */}
        <section id="problem" className="section-a scroll-fade-up" style={{ padding: "90px 0 70px" }}>
          <div className="section-a__inner">
            <div className="problem">
              <h2 className="h2-b" style={{ fontSize: "34px", marginBottom: "54px", letterSpacing: "-0.5px" }}>
                ミエリスならこんな現場のお悩みを解決
              </h2>
              <div className="case__inner" style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
                
                {/* 悩み 1 */}
                <div className="case__item cream_bg scroll-fade-up" style={{ flex: "1 1 320px", maxWidth: "360px", padding: "36px 24px 28px", borderRadius: "16px", backgroundColor: "#fbf8ee", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "inline-block", fontSize: "11px", fontWeight: "900", letterSpacing: "1.2px", color: "#3F6ECC", backgroundColor: "#EDF6FF", padding: "3px 10px", borderRadius: "20px", marginBottom: "12px", border: "1px solid #d0e4ff" }}>
                      MIERIS WORK
                    </div>
                    <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", lineHeight: "1.5", minHeight: "58px", color: "#202226" }}>
                      求人費をかけたのに<br className="only-pc" />当日欠勤で現場に穴が開く
                    </h4>
                    <div className="worries_down_arrow" style={{ margin: "20px auto" }}>
                      <img src="https://www.kaonavi.jp/lp/lms_1052/img/down_arrow.svg" alt="下矢印" style={{ width: "32px", height: "32px" }} />
                    </div>
                    <div className="worries_blue_text" style={{ fontSize: "17px", fontWeight: "bold", color: "#3F6ECC", lineHeight: "1.5", marginBottom: "20px" }}>
                      面接前に氏名・生年月日で<br className="only-pc" />就業実績をシステム照会
                    </div>
                  </div>
                  <div className="case__logo worries_img" style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #dadcdf", backgroundColor: "#ffffff" }}>
                    <img
                      src="/demo-assets/feat-person.jpg"
                      alt="求職者検索結果UI"
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                </div>

                {/* 悩み 2 */}
                <div className="case__item cream_bg scroll-fade-up scroll-delay-1" style={{ flex: "1 1 320px", maxWidth: "360px", padding: "36px 24px 28px", borderRadius: "16px", backgroundColor: "#fbf8ee", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "inline-block", fontSize: "11px", fontWeight: "900", letterSpacing: "1.2px", color: "#4f46e5", backgroundColor: "#EEF2FF", padding: "3px 10px", borderRadius: "20px", marginBottom: "12px", border: "1px solid #e0e7ff" }}>
                      MIERIS CREDIT
                    </div>
                    <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", lineHeight: "1.5", minHeight: "58px", color: "#202226" }}>
                      初めての取引先から受注<br className="only-pc" />期日を過ぎても代金未払い
                    </h4>
                    <div className="worries_down_arrow" style={{ margin: "20px auto" }}>
                      <img src="https://www.kaonavi.jp/lp/lms_1052/img/down_arrow.svg" alt="下矢印" style={{ width: "32px", height: "32px" }} />
                    </div>
                    <div className="worries_blue_text" style={{ fontSize: "17px", fontWeight: "bold", color: "#3F6ECC", lineHeight: "1.5", marginBottom: "20px" }}>
                      商号・法人番号で<br className="only-pc" />未払い履歴を事前に把握
                    </div>
                  </div>
                  <div className="case__logo worries_img" style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #dadcdf", backgroundColor: "#ffffff" }}>
                    <img
                      src="/demo-assets/feat-credit.jpg"
                      alt="企業信用照会UI"
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                </div>

                {/* 悩み 3 */}
                <div className="case__item cream_bg scroll-fade-up scroll-delay-2" style={{ flex: "1 1 320px", maxWidth: "360px", padding: "36px 24px 28px", borderRadius: "16px", backgroundColor: "#fbf8ee", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "inline-block", fontSize: "11px", fontWeight: "900", letterSpacing: "1.2px", color: "#025D2C", backgroundColor: "#ECFAEC", padding: "3px 10px", borderRadius: "20px", marginBottom: "12px", border: "1px solid #cceccc" }}>
                      COMPLIANCE RULE
                    </div>
                    <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", lineHeight: "1.5", minHeight: "58px", color: "#202226" }}>
                      個人情報や「晒し」による<br className="only-pc" />法的なトラブル・訴訟が心配
                    </h4>
                    <div className="worries_down_arrow" style={{ margin: "20px auto" }}>
                      <img src="https://www.kaonavi.jp/lp/lms_1052/img/down_arrow.svg" alt="下矢印" style={{ width: "32px", height: "32px" }} />
                    </div>
                    <div className="worries_blue_text" style={{ fontSize: "17px", fontWeight: "bold", color: "#3F6ECC", lineHeight: "1.5", marginBottom: "20px" }}>
                      本人同意書と運営承認で<br className="only-pc" />客観的事実のみを共有
                    </div>
                  </div>
                  <div className="case__logo worries_img" style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #dadcdf", backgroundColor: "#ffffff" }}>
                    <img
                      src="/demo-assets/feat-legal.jpg"
                      alt="法的同意書管理UI"
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 6. カオナビ完全同期 機能一覧・強み (strength) */}
        <section className="section-a section-a--cream scroll-fade-up" style={{ padding: "90px 0" }}>
          <div className="section-a__inner">
            <div className="strength">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "54px" }}>
                <p className="h2-a__subtitle" style={{ fontSize: "15px", fontWeight: "bold", color: "#3F6ECC", marginBottom: "8px" }}>だから、選ばれる</p>
                <h2 className="h2-a__title" style={{ fontSize: "34px", fontWeight: "bold", letterSpacing: "-0.5px" }}>ミエリスの「リスク管理システム」の強み</h2>
              </div>
              <ul className="reason-list" style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", padding: 0 }}>
                
                <li className="item user scroll-fade-up" style={{ flex: "1 1 320px", maxWidth: "360px", backgroundColor: "#ffffff", padding: "36px 28px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(115,115,120,0.08)" }}>
                  <h3 className="title" style={{ fontSize: "21px", fontWeight: "bold", lineHeight: "1.4", marginBottom: "18px", color: "#202226" }}>
                    誰でも使いやすい<br />操作画面
                  </h3>
                  <div style={{ height: "130px", backgroundColor: "#f0f1f5", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "1px solid #e5e6ea" }}>
                    <span style={{ fontSize: "15px", fontWeight: "bold", color: "#3F6ECC" }}>検索・確認・登録の3ステップ</span>
                  </div>
                  <p className="desc" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    専門的な研修やマニュアルは不要。応募書類が届いたら氏名で照会、該当があれば確認。内勤スタッフの手間を一切増やしません。
                  </p>
                </li>

                <li className="item support scroll-fade-up scroll-delay-1" style={{ flex: "1 1 320px", maxWidth: "360px", backgroundColor: "#ffffff", padding: "36px 28px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(115,115,120,0.08)" }}>
                  <h3 className="title" style={{ fontSize: "21px", fontWeight: "bold", lineHeight: "1.4", marginBottom: "18px", color: "#202226" }}>
                    ニーズに応じた<br />高い柔軟性
                  </h3>
                  <div style={{ height: "130px", backgroundColor: "#EDF6FF", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "20px", border: "1px solid #d0d1d3" }}>
                    <span style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "0.5px", color: "#3F6ECC" }}>MIERIS WORK ＋ CREDIT</span>
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: "#737378" }}>就業照会 ＆ 企業信用</span>
                  </div>
                  <p className="desc" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    就業トラブルを防ぐ「MIERIS WORK」、取引先の焦げ付きを防ぐ「MIERIS CREDIT」、両方を網羅する「MIERIS FULL」の3つの契約形態をご用意。現場の課題に即した導入が可能です。
                  </p>
                </li>

                <li className="item custom scroll-fade-up scroll-delay-2" style={{ flex: "1 1 320px", maxWidth: "360px", backgroundColor: "#ffffff", padding: "36px 28px", borderRadius: "16px", boxShadow: "0 4px 16px rgba(115,115,120,0.08)" }}>
                  <h3 className="title" style={{ fontSize: "21px", fontWeight: "bold", lineHeight: "1.4", marginBottom: "18px", color: "#202226" }}>
                    適法運用に応じた<br />厳格なルール体制
                  </h3>
                  <div style={{ height: "130px", backgroundColor: "#ECFAEC", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "1px solid #d0d1d3" }}>
                    <span style={{ fontSize: "15px", fontWeight: "bold", color: "#025D2C" }}>弁護士監修・6つの運用ルール</span>
                  </div>
                  <p className="desc" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    同意書添付の必須化、運営管理者による全件審査、感情的評価の排除、5年での自動データ削除により、法的な安全性を完全に担保しています。
                  </p>
                </li>

              </ul>
            </div>
            <div className="conv-01" style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "54px" }}>
              <a className="button-a button-a--blue" href="#contact" style={{ padding: "16px 28px" }}>
                <span className="button-a__deco">3分でわかるミエリス</span>
                <span style={{ fontSize: "15px" }}>詳しいPDF資料を見る</span>
              </a>
              <a className="button-a button-a--white" href="#contact" style={{ padding: "16px 28px" }}>
                <span style={{ fontSize: "15px" }}>問い合わせをする</span>
              </a>
            </div>
          </div>
        </section>

        {/* 7. カオナビ完全同期 活用シーン (case) */}
        <section className="section-a section-a--cream scroll-fade-up" style={{ padding: "90px 0", borderTop: "1px solid #e5e6ea" }}>
          <div className="section-a__inner">
            <div className="case">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "54px" }}>
                <p className="h2-a__subtitle" style={{ fontSize: "15px", fontWeight: "bold", color: "#3F6ECC", marginBottom: "8px" }}>現場運用の様々な課題に対応</p>
                <h2 className="h2-a__title" style={{ fontSize: "34px", fontWeight: "bold", letterSpacing: "-0.5px" }}>ミエリスの活用シーン</h2>
              </div>
              <div className="case__inner line-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                
                <div className="case__item scroll-fade-up" style={{ backgroundColor: "#ffffff", padding: "32px 28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.06)", display: "flex", flexDirection: "column" }}>
                  <div className="case__logo" style={{ textAlign: "center", marginBottom: "20px", height: "135px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/demo-assets/case-01.png" alt="就業トラブルの事前可視化" style={{ maxHeight: "125px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                  <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", color: "#202226", marginBottom: "14px" }}>
                    <span style={{ display: "block", fontSize: "12px", color: "#3F6ECC", fontWeight: "900", letterSpacing: "1px", marginBottom: "4px" }}>MIERIS WORK</span>
                    就業トラブルの事前可視化
                  </h4>
                  <p className="case__text" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    面接前に氏名・生年月日で照会することで、過去の当日欠勤や無断不通、現場での重大トラブル実績を事前に確認できます。
                  </p>
                </div>

                <div className="case__item scroll-fade-up scroll-delay-1" style={{ backgroundColor: "#ffffff", padding: "32px 28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.06)", display: "flex", flexDirection: "column" }}>
                  <div className="case__logo" style={{ textAlign: "center", marginBottom: "20px", height: "135px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/demo-assets/case-02.png" alt="取引先未払いリスクの事前把握" style={{ maxHeight: "125px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                  <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", color: "#202226", marginBottom: "14px" }}>
                    <span style={{ display: "block", fontSize: "12px", color: "#4f46e5", fontWeight: "900", letterSpacing: "1px", marginBottom: "4px" }}>MIERIS CREDIT</span>
                    取引先未払いリスクの事前把握
                  </h4>
                  <p className="case__text" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    初めて受注する企業について、過去に発生した支払遅延や未払い代金の有無を照会。取引条件の事前見直しに役立てられます。
                  </p>
                </div>

                <div className="case__item scroll-fade-up scroll-delay-2" style={{ backgroundColor: "#ffffff", padding: "32px 28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.06)", display: "flex", flexDirection: "column" }}>
                  <div className="case__logo" style={{ textAlign: "center", marginBottom: "20px", height: "135px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/demo-assets/case-03.png" alt="客観的事実の登録フロー" style={{ maxHeight: "125px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                  <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", color: "#202226", marginBottom: "14px" }}>客観的事実の登録フロー</h4>
                  <p className="case__text" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    トラブルが発生した際、感情的な記述を排し「起きた客観的事実」とエビデンス資料のみを運営に申請。審査を経て共有されます。
                  </p>
                </div>

                <div className="case__item scroll-fade-up" style={{ backgroundColor: "#ffffff", padding: "32px 28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.06)", display: "flex", flexDirection: "column" }}>
                  <div className="case__logo" style={{ textAlign: "center", marginBottom: "20px", height: "135px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/demo-assets/case-04.png" alt="本人同意書の電子管理" style={{ maxHeight: "125px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                  <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", color: "#202226", marginBottom: "14px" }}>本人同意書の電子管理</h4>
                  <p className="case__text" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    面接時や取引開始時に取得した所定の同意書をPDFで保管。適法性の証拠としてセキュアに一元管理します。
                  </p>
                </div>

                <div className="case__item scroll-fade-up scroll-delay-1" style={{ backgroundColor: "#ffffff", padding: "32px 28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.06)", display: "flex", flexDirection: "column" }}>
                  <div className="case__logo" style={{ textAlign: "center", marginBottom: "20px", height: "135px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/demo-assets/case-05.png" alt="入金完了後の解決済み更新" style={{ maxHeight: "125px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                  <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", color: "#202226", marginBottom: "14px" }}>入金完了後の解決済み更新</h4>
                  <p className="case__text" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    未払いだった代金が支払われた場合は、5営業日以内に「解決済み（遅延○日）」へとステータスが更新され、公平性を担保します。
                  </p>
                </div>

                <div className="case__item scroll-fade-up scroll-delay-2" style={{ backgroundColor: "#ffffff", padding: "32px 28px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(115,115,120,0.06)", display: "flex", flexDirection: "column" }}>
                  <div className="case__logo" style={{ textAlign: "center", marginBottom: "20px", height: "135px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/demo-assets/case-06.png" alt="支店・営業所での一括運用" style={{ maxHeight: "125px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                  <h4 className="case__title" style={{ fontSize: "19px", fontWeight: "bold", color: "#202226", marginBottom: "14px" }}>支店・営業所での一括運用</h4>
                  <p className="case__text" style={{ fontSize: "14px", color: "#56575b", lineHeight: "1.8" }}>
                    複数拠点を持つ企業でも、支店ごとにアカウントを追加発行して現場の内勤担当者がリアルタイムに照会・登録できます。
                  </p>
                </div>

              </div>
            </div>

            <div className="conv-01" style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "54px" }}>
              <a className="button-a button-a--blue" href="#contact" style={{ padding: "16px 28px" }}>
                <span className="button-a__deco">3分でわかるミエリス</span>
                <span style={{ fontSize: "15px" }}>詳しいPDF資料を見る</span>
              </a>
              <a className="button-a button-a--white" href="#contact" style={{ padding: "16px 28px" }}>
                <span style={{ fontSize: "15px" }}>無料デモを申し込む</span>
              </a>
            </div>
          </div>
        </section>

        {/* 8. カオナビ完全同期 導入事例 (showcase) */}
        <section className="section-a scroll-fade-up" style={{ padding: "90px 0" }}>
          <div className="section-a__inner">
            <div className="cando showcase">
              <div className="cando__heading">
                <h2 className="h2-b" style={{ fontSize: "34px", marginBottom: "54px", letterSpacing: "-0.5px" }}>導入事例</h2>
              </div>
              <div className="cando__inner" style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
                
                {/* 事例 1 */}
                <div className="cando__item scroll-fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px", backgroundColor: "#fbf8ee", padding: "40px", borderRadius: "16px", position: "relative" }}>
                  <div className="cando__content balloon" style={{ flex: "1 1 auto", backgroundColor: "#ffffff", padding: "32px", borderRadius: "12px", border: "2px solid #EDDFBB", position: "relative" }}>
                    <h3 className="cando__title" style={{ fontSize: "16px", lineHeight: "1.85", color: "#202226" }}>
                      <span className="large-title underline" style={{ fontSize: "21px", fontWeight: "bold", color: "#3F6ECC", display: "inline-block", borderBottom: "3px solid #FFDA1B", paddingBottom: "2px", marginBottom: "12px" }}>
                        初日の当日欠勤が激減し、職長に頭を下げる日々から解放された
                      </span>
                      <br />
                      荷揚げの現場では朝1人来ないだけで作業が完全に止まります。面接前に1分照会する習慣をつけただけで、他社で直前バックレを繰り返していた人物を事前に回避できるようになり、現場の定着率が劇的に上がりました。
                    </h3>
                    <div className="showcase__logo" style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                      <p className="text-a" style={{ fontSize: "14px", fontWeight: "bold", color: "#56575b", margin: 0 }}>──株式会社宮島建設 代表取締役さま（揚重・荷揚げ業）</p>
                    </div>
                  </div>
                  <div className="cando__image cando__image--01" style={{ position: "relative", zIndex: 2, flex: "0 0 230px", width: "230px", borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 24px rgba(32,34,38,0.12)" }}>
                    <img src="/demo-assets/voice-01.jpg" alt="株式会社宮島建設 代表取締役さま" style={{ width: "100%", height: "190px", objectFit: "cover", display: "block" }} />
                  </div>
                </div>

                {/* 事例 2 */}
                <div className="cando__item scroll-fade-up" style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: "40px", backgroundColor: "#fbf8ee", padding: "40px", borderRadius: "16px", position: "relative" }}>
                  <div className="cando__content balloon" style={{ flex: "1 1 auto", backgroundColor: "#ffffff", padding: "32px", borderRadius: "12px", border: "2px solid #EDDFBB", position: "relative" }}>
                    <h3 className="cando__title" style={{ fontSize: "16px", lineHeight: "1.85", color: "#202226" }}>
                      <span className="large-title underline" style={{ fontSize: "21px", fontWeight: "bold", color: "#3F6ECC", display: "inline-block", borderBottom: "3px solid #FFDA1B", paddingBottom: "2px", marginBottom: "12px" }}>
                        弁護士監修で同意書が必須だから、現場の採用担当も安心運用
                      </span>
                      <br />
                      ブラックリストと聞くと違法性やクレームが不安でしたが、面接時の同意書取得ルールや運営の全件審査が徹底しており、むしろ真面目に働いてくれる人にとっても安心できる仕組みだと納得して導入できました。
                    </h3>
                    <div className="showcase__logo" style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                      <p className="text-a" style={{ fontSize: "14px", fontWeight: "bold", color: "#56575b", margin: 0 }}>──広域総合警備保障株式会社 人事部長さま（交通誘導警備業）</p>
                    </div>
                  </div>
                  <div className="cando__image cando__image--01" style={{ position: "relative", zIndex: 2, flex: "0 0 230px", width: "230px", borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 24px rgba(32,34,38,0.12)" }}>
                    <img src="/demo-assets/voice-02.jpg" alt="広域総合警備保障株式会社 人事部長さま" style={{ width: "100%", height: "190px", objectFit: "cover", display: "block" }} />
                  </div>
                </div>

                {/* 事例 3 */}
                <div className="cando__item scroll-fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px", backgroundColor: "#fbf8ee", padding: "40px", borderRadius: "16px", position: "relative" }}>
                  <div className="cando__content balloon" style={{ flex: "1 1 auto", backgroundColor: "#ffffff", padding: "32px", borderRadius: "12px", border: "2px solid #EDDFBB", position: "relative" }}>
                    <h3 className="cando__title" style={{ fontSize: "16px", lineHeight: "1.85", color: "#202226" }}>
                      <span className="large-title underline" style={{ fontSize: "21px", fontWeight: "bold", color: "#3F6ECC", display: "inline-block", borderBottom: "3px solid #FFDA1B", paddingBottom: "2px", marginBottom: "12px" }}>
                        新規取引先の遅延履歴を発見し、前受金取引で焦げ付きを回避
                      </span>
                      <br />
                      初めて取引する会社からの急な運送依頼。MIERIS CREDIT（ミエリスクレジット）で照会したところ、他社で未払い発生の記録があり、契約条件を『事前振込』に変更。結果的に代金未払いリスクを完全にゼロに抑えられました。
                    </h3>
                    <div className="showcase__logo" style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                      <p className="text-a" style={{ fontSize: "14px", fontWeight: "bold", color: "#56575b", margin: 0 }}>──城南建材ロジスティクス株式会社 専務取締役さま（一般貨物自動車運送業）</p>
                    </div>
                  </div>
                  <div className="cando__image cando__image--01" style={{ position: "relative", zIndex: 2, flex: "0 0 230px", width: "230px", borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 24px rgba(32,34,38,0.12)" }}>
                    <img src="/demo-assets/voice-03.jpg" alt="城南建材ロジスティクス株式会社 専務取締役さま" style={{ width: "100%", height: "190px", objectFit: "cover", display: "block" }} />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 9. カオナビ完全同期 シンプルな料金体系 (Pricing) */}
        <section id="estimate" className="section-a section-a--cream scroll-fade-up" style={{ padding: "90px 0" }}>
          <div className="section-a__inner">
            <div className="case">
              <h2 className="h2-b" style={{ fontSize: "34px", letterSpacing: "-0.5px" }}>シンプルな料金体系</h2>
              <p className="h2-a h2-a__text" style={{ textAlign: "center", marginBottom: "44px", fontSize: "16px", color: "#56575b" }}>
                1社1アカウント。支店・営業所ごとに柔軟に追加可能。初期費用と月額費用でシンプルな料金体系。
              </p>
              
              <div className="child-inner estimate_cta_area" style={{ backgroundColor: "#ffffff", padding: "50px 48px", borderRadius: "16px", boxShadow: "0 6px 24px rgba(115,115,120,0.08)", display: "flex", alignItems: "center", justifyContent: "center", gap: "48px", maxWidth: "960px", margin: "0 auto", flexWrap: "wrap" }}>
                
                <div className="estimate_image" style={{ flex: "0 1 340px", textAlign: "center" }}>
                  <img src="/demo-assets/price.png" alt="初期費用＋月額費用" style={{ width: "100%", maxWidth: "300px", height: "auto", display: "inline-block" }} />
                  <div style={{ marginTop: "14px", fontSize: "13px", color: "#737378", fontWeight: "bold" }}>
                    初期事務手数料: 10,000円（税別）
                  </div>
                </div>

                <div className="estimate_cont" style={{ flex: "1 1 420px" }}>
                  <h3 className="child-font estimate_title" style={{ fontSize: "23px", fontWeight: "bold", marginBottom: "22px", color: "#202226", marginTop: 0 }}>
                    まずはお気軽に、お見積りください。
                  </h3>
                  <div className="member price">
                    <div className="estimate-set" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      
                      <div className="select-set" style={{ width: "360px", maxWidth: "100%", height: "52px", margin: 0, position: "relative" }}>
                        <select
                          name="plan"
                          value={selectedPlan}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="member-select"
                          style={{ fontSize: "14px", fontWeight: "bold", paddingLeft: "14px" }}
                        >
                          <option value="full">MIERIS FULL（就業照会＋企業信用 両用セット）</option>
                          <option value="employment">MIERIS WORK（応募者・就業情報プラン）</option>
                          <option value="credit">MIERIS CREDIT（企業信用情報プラン）</option>
                        </select>
                      </div>

                      <a href="#contact" className="button-a button-a--blue" style={{ height: "52px", padding: "0 28px", display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: "16px" }}>費用の見積りをする</span>
                      </a>

                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 10. カオナビ完全同期 システムと活用ノウハウ (knowhow) */}
        <section className="section-a section-a--narrow scroll-fade-up" style={{ padding: "90px 0" }}>
          <div className="section-a__inner">
            <div className="knowhow">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "54px" }}>
                <p className="h2-a__subtitle" style={{ fontSize: "15px", fontWeight: "bold", color: "#3F6ECC", marginBottom: "8px" }}>ミエリスだけが提供できる</p>
                <h2 className="h2-a__title" style={{ fontSize: "34px", fontWeight: "bold", letterSpacing: "-0.5px" }}>システムと<br className="sp-block only-sp" />活用ノウハウ</h2>
                <p className="h2-a__text" style={{ fontSize: "16px", color: "#56575b", lineHeight: "1.85", marginTop: "18px" }}>
                  現場の課題は会社によってさまざま。<br />
                  だからこそミエリスは、建設・警備・運送あらゆる業種に対応できるようなシステムを提供しています。<br />
                  また、システムを導入すれば終わり、ではなく、<br className="sp-hidden only-pc" />
                  弁護士監修の適法な運用ノウハウも合わせて提供できることがミエリスの最大の強みです。
                </p>
              </div>

              <div className="knowhow__inner" style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: "32px", position: "relative", flexWrap: "wrap" }}>
                
                <div className="knowhow__item knowhow__item--blue scroll-fade-up" style={{ flex: "1 1 420px", maxWidth: "490px", backgroundColor: "#ffffff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 6px 20px rgba(115,115,120,0.08)", borderTop: "4px solid #3F6ECC" }}>
                  <div className="knowhow__card" style={{ padding: "36px 32px" }}>
                    <div className="knowhow__image" style={{ textAlign: "center", marginBottom: "20px" }}>
                      <img src="/demo-assets/image-knowhow-01.png" alt="安心安全なシステム" style={{ width: "100%", maxWidth: "340px", height: "auto", margin: "0 auto", display: "block" }} />
                    </div>
                    <p className="knowhow__itemHeading" style={{ fontSize: "15px", fontWeight: "bold", color: "#3F6ECC", textAlign: "center", marginBottom: "6px" }}>シンプルで柔軟</p>
                    <h3 className="knowhow__itemHeading--large" style={{ fontSize: "24px", fontWeight: "bold", color: "#202226", textAlign: "center", marginBottom: "22px" }}>安心安全なシステム</h3>
                    <ul className="knowhow__list" style={{ paddingLeft: "16px", lineHeight: "2.2", fontSize: "15px", color: "#45464a", margin: 0 }}>
                      <li className="knowhow__listItem">1分で照会完了する直感ユーザー画面</li>
                      <li className="knowhow__listItem">MIERIS WORK ＆ CREDIT で現場と経営をダブル防御</li>
                      <li className="knowhow__listItem">セキュアに情報共有するアクセス管理</li>
                    </ul>
                  </div>
                </div>

                <div className="knowhow__item knowhow__item--green scroll-fade-up" style={{ flex: "1 1 420px", maxWidth: "490px", backgroundColor: "#ffffff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 6px 20px rgba(115,115,120,0.08)", borderTop: "4px solid #30a143" }}>
                  <div className="knowhow__card" style={{ padding: "36px 32px" }}>
                    <div className="knowhow__image" style={{ textAlign: "center", marginBottom: "20px" }}>
                      <img src="/demo-assets/image-knowhow-02.png" alt="育んだノウハウ" style={{ width: "100%", maxWidth: "340px", height: "auto", margin: "0 auto", display: "block" }} />
                    </div>
                    <p className="knowhow__itemHeading" style={{ fontSize: "15px", fontWeight: "bold", color: "#30a143", textAlign: "center", marginBottom: "6px" }}>120社の導入企業が</p>
                    <h3 className="knowhow__itemHeading--large" style={{ fontSize: "24px", fontWeight: "bold", color: "#202226", textAlign: "center", marginBottom: "22px" }}>育んだノウハウ</h3>
                    <ul className="knowhow__list" style={{ paddingLeft: "16px", lineHeight: "2.2", fontSize: "15px", color: "#45464a", margin: 0 }}>
                      <li className="knowhow__listItem">弁護士監修の同意書・規約テンプレート完備</li>
                      <li className="knowhow__listItem">運営管理者による全件審査・伴走サポート</li>
                      <li className="knowhow__listItem">業界特化のトラブル情報データベース</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 11. カオナビ完全同期 CTAセクション (お電話 & お問い合わせ) */}
        <section id="contact" className="section-a section-a--yellow section-a--narrow scroll-fade-up" style={{ padding: "90px 0", backgroundColor: "#ffda1b" }}>
          <div className="section-a__inner">
            <div className="conv-02">
              <div className="h2-a" style={{ textAlign: "center", marginBottom: "44px" }}>
                <h2 className="h2-a__title" style={{ fontSize: "34px", fontWeight: "bold", color: "#202226", letterSpacing: "-0.5px" }}>
                  資料も無料体験も、<br className="sp-block only-sp" />ぜひお試しください
                </h2>
              </div>
              <div className="conv-02__inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "32px", flexWrap: "wrap", maxWidth: "940px", margin: "0 auto" }}>
                
                <div className="conv-02__box" style={{ display: "flex", gap: "16px", flex: "1 1 300px", maxWidth: "100%", width: "100%", minWidth: 0 }}>
                  <div className="conv-02__item" style={{ flex: 1, minWidth: 0 }}>
                    <a className="button-a button-a--blue conv-02__button" href="#contact-form" style={{ width: "100%", padding: "18px 10px" }}>
                      <span className="button-a__deco">3分でわかるミエリス</span>
                      <span style={{ fontSize: "15px" }}>詳しいPDF資料を見る</span>
                    </a>
                  </div>
                  <div className="conv-02__item" style={{ flex: 1, minWidth: 0 }}>
                    <a className="button-a button-a--white conv-02__button" href="#contact-form" style={{ width: "100%", padding: "18px 10px" }}>
                      <span style={{ fontSize: "15px" }}>無料デモを申し込む</span>
                    </a>
                  </div>
                </div>

                <div className="conv-02__phone" style={{ flex: "1 1 300px", maxWidth: "100%", width: "100%", minWidth: 0, textAlign: "center" }}>
                  <h3 className="conv-02__phoneHeading" style={{ fontSize: "16px", fontWeight: "bold", color: "#202226", marginBottom: "8px" }}>
                    お電話でも、お問い合わせいただけます
                  </h3>
                  <div className="conv-02__phoneNum" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "10px" }}>
                    <a 
                      href="tel:08055846715"
                      className="conv-02__phoneNum--link" 
                      style={{ fontSize: "28px", fontWeight: "900", color: "#3F6ECC", fontFamily: "monospace", textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}
                    >
                      080-5584-6715
                    </a>
                    <div className="conv-02__phoneTime" style={{ fontSize: "13px", color: "#56575b", whiteSpace: "nowrap" }}>
                      <span>10:00-18:00</span> <span style={{ marginLeft: "6px" }}>土日祝除く</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 簡易問い合わせフォーム */}
        <section id="contact-form" className="scroll-fade-up" style={{ padding: "70px 0", backgroundColor: "#ffffff" }}>
          <div className="section-a__inner" style={{ maxWidth: "620px", margin: "0 auto", padding: "0 20px" }}>
            <div style={{ backgroundColor: "#fbf8ee", padding: "40px", borderRadius: "16px", border: "1px solid #dadcdf", boxShadow: "0 4px 16px rgba(115,115,120,0.06)" }}>
              <h3 style={{ fontSize: "22px", fontWeight: "bold", textAlign: "center", marginBottom: "24px", color: "#202226" }}>
                資料請求・無料デモお申込み
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); alert("お問い合わせを受け付けました。担当者よりご連絡いたします。"); }}>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#202226" }}>貴社名</label>
                  <input type="text" required placeholder="例: 株式会社ミエリス建設" style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#202226" }}>ご担当者様名</label>
                  <input type="text" required placeholder="例: 山田 太郎" style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#202226" }}>メールアドレス</label>
                  <input type="email" required placeholder="例: info@example.com" style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#202226" }}>お電話番号</label>
                  <input type="tel" required placeholder="例: 03-1234-5678" style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid #dadcdf", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <button type="submit" className="button-a button-a--blue" style={{ width: "100%", maxWidth: "100%", padding: "16px" }}>
                  <span style={{ fontSize: "16px" }}>送信する</span>
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* 12. カオナビ完全同期 フッター */}
      <footer className="footer" style={{ borderTop: "1px solid #e5e6ea", padding: "48px 0" }}>
        <div className="footer__inner" style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 20px" }}>
          <div className="footer__logo" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "28px" }}>
            <div className="footer__logoItem" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img src="/logo-mark.png" alt="MIERIS" style={{ width: "32px", height: "32px" }} />
              <span style={{ fontSize: "18px", fontWeight: "900", color: "#202226", letterSpacing: "1px" }}>MIERIS</span>
            </div>
            <ul className="footer__linkList" style={{ display: "flex", gap: "20px", padding: 0, margin: 0 }}>
              <li className="item"><a className="link" href="#hero" style={{ fontSize: "13px" }}>サービス紹介</a></li>
              <li className="item"><a className="link" href="#problem" style={{ fontSize: "13px" }}>お悩み解決</a></li>
              <li className="item"><a className="link" href="#estimate" style={{ fontSize: "13px" }}>料金プラン</a></li>
              <li className="item"><a className="link" href="#contact" style={{ fontSize: "13px" }}>資料請求</a></li>
            </ul>
          </div>
          <div className="footer__mark" style={{ textAlign: "center", borderTop: "1px solid #f0f1f5", paddingTop: "24px" }}>
            <p className="footer__copyright" style={{ fontSize: "13px", color: "#737378", lineHeight: "1.8" }}>
              運営：株式会社ミヤエモン / 開発：株式会社宇井建設<br />
              &copy; 2026 MIERIS, Inc. All Rights Reserved.
            </p>
            <p className="footer__markText" style={{ fontSize: "11px", color: "#949598", marginTop: "10px" }}>
              サイトに掲載されている製品画面内の氏名・プロフィール・企業情報等はすべてサンプルです。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
