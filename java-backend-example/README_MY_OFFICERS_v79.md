# v79 아군 인재 목록 API 연동

프론트엔드는 기본적으로 현재 브라우저 세션의 아군 인재만 사용합니다.
실제 Java 서버 API를 연결할 경우 전역 설정만 지정하면 됩니다.

```html
<script>
window.SAMGUK_MY_OFFICER_API_URL = '/api/me/officers';
</script>
```

서버에서는 `MyOfficerListService#getMyOfficers(session)`처럼 반드시
`playerFaction.getOfficers()`만 응답하고, 전체 장수 저장소를 프론트에 보내지 않습니다.
응답은 `{ factionId, factionCode, factionName, officers: [...] }` 형태입니다.
