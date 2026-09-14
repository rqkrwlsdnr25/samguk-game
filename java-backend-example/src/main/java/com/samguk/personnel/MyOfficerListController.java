package com.samguk.personnel;

/**
 * Framework-neutral endpoint adapter.
 * Bind getMyOfficerList(session) to GET /api/me/officers in Astra/Spring/etc.
 */
public final class MyOfficerListController {
    private final MyOfficerListService service;

    public MyOfficerListController(MyOfficerListService service) {
        this.service = service;
    }

    public MyOfficerListService.OfficerListResponse getMyOfficerList(
        MyOfficerListService.PlayerSession session
    ) {
        return service.getMyOfficers(session);
    }
}
