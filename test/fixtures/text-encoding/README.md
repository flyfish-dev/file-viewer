# Single-byte text encoding fixtures

Original sentences written for this repository and saved without UTF-8 so the
`auto` text encoding path has to pick a fallback decoder:

- `latin1-umlauts.txt` is ISO-8859-1. The umlauts and `ß` are the single bytes
  `FC`, `E4`, `F6`, and `DF`, which strict UTF-8 validation rejects.
- `windows-1251-cyrillic.txt` is Windows-1251. Every Cyrillic letter is one
  byte in the `C0`–`FF` range.

Both files are structurally valid GB18030, so they used to render as CJK
characters (`Saarbr點ken`). They are regenerated with:

```sh
printf "%s\n" "Die Straße in Saarbrücken ist für Fußgänger gesperrt." \
  "Nächste Woche öffnet das Büro in der Nähe wieder." \
  | iconv -f UTF-8 -t ISO-8859-1 > latin1-umlauts.txt
printf "%s\n" "Съешь же ещё этих мягких французских булок, да выпей чаю." \
  "Файл сохранён в кодировке Windows-1251, а не UTF-8." \
  | iconv -f UTF-8 -t WINDOWS-1251 > windows-1251-cyrillic.txt
```
