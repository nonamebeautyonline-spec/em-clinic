import { describe, it, expect } from "vitest";
import { hasAddressDuplication, addressDetailStartsWithPrefecture } from "@/lib/address-utils";

describe("hasAddressDuplication", () => {
  // --- 重複あり ---
  it("都道府県が2連続", () => {
    expect(hasAddressDuplication("東京都東京都新宿区西新宿2-8-1")).toBe(true);
    expect(hasAddressDuplication("大阪府大阪府大阪市東淀川区菅原1-16-9")).toBe(true);
    expect(hasAddressDuplication("北海道北海道札幌市中央区南9条西7丁目")).toBe(true);
  });

  it("zipcloud部分 + フルアドレスの重複", () => {
    expect(hasAddressDuplication("北海道札幌市清田区平岡四条北海道札幌市清田区平岡4条6丁目6-32")).toBe(true);
    expect(hasAddressDuplication("広島県広島市南区松原町広島県広島市南区松原5-21411")).toBe(true);
    expect(hasAddressDuplication("東京都杉並区阿佐谷南東京都杉並区阿佐ヶ谷南3丁目31-5")).toBe(true);
    expect(hasAddressDuplication("和歌山県和歌山市口須佐和歌山県和歌山口須佐100-12")).toBe(true);
    expect(hasAddressDuplication("大阪府大阪市東淀川区小松大阪府大阪市小松4丁目6-8")).toBe(true);
  });

  it("2世代目の重複", () => {
    expect(hasAddressDuplication("千葉県成田市幸町千葉県成田市幸町930-14")).toBe(true);
    expect(hasAddressDuplication("群馬県高崎市双葉町群馬県高崎市双葉町20-15エスパシオA202")).toBe(true);
  });

  it("郵便番号変更で町域不一致の重複", () => {
    expect(hasAddressDuplication("東京都足立区梅田東京都足立区関原2-22-21エリール1 305号室")).toBe(true);
    expect(hasAddressDuplication("石川県能美郡川北町中島石川県川北町は50-1サンハイム中島304")).toBe(true);
  });

  // --- 重複なし（正常） ---
  it("通常の住所", () => {
    expect(hasAddressDuplication("東京都新宿区西新宿2-8-1")).toBe(false);
    expect(hasAddressDuplication("北海道札幌市清田区平岡四条6丁目6-32")).toBe(false);
    expect(hasAddressDuplication("大阪府大阪市東淀川区小松4丁目6-8")).toBe(false);
  });

  it("建物名に区名が含まれるケース（誤検出しない）", () => {
    expect(hasAddressDuplication("東京都板橋区仲宿15-2リルシア板橋区役所前103")).toBe(false);
  });

  it("京都府京都市は重複ではない", () => {
    expect(hasAddressDuplication("京都府京都市中京区堂之前町240")).toBe(false);
  });

  it("富山県射水市の県営住宅（誤検出しない）", () => {
    expect(hasAddressDuplication("富山県射水市池多272-1太閤山東県営住宅1-306")).toBe(false);
  });

  it("空文字・null系", () => {
    expect(hasAddressDuplication("")).toBe(false);
    expect(hasAddressDuplication("   ")).toBe(false);
  });
});

describe("addressDetailStartsWithPrefecture", () => {
  it("都道府県で始まる", () => {
    expect(addressDetailStartsWithPrefecture("東京都新宿区西新宿2-8-1")).toBe(true);
    expect(addressDetailStartsWithPrefecture("大阪府大阪市東淀川区菅原1-16-9")).toBe(true);
    expect(addressDetailStartsWithPrefecture("北海道札幌市清田区平岡4条6丁目")).toBe(true);
  });

  it("番地から始まる（正常）", () => {
    expect(addressDetailStartsWithPrefecture("3丁目31-5Kdxレジデンス")).toBe(false);
    expect(addressDetailStartsWithPrefecture("2-8-1ビル101")).toBe(false);
    expect(addressDetailStartsWithPrefecture("930-14")).toBe(false);
  });

  it("空文字", () => {
    expect(addressDetailStartsWithPrefecture("")).toBe(false);
  });
});
