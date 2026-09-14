// UI reference: the live implementation is integrated in game.js.
export function officerSidebarModel({sourceCommander,targetGovernor,targetOfficers,step}){
  const showingTarget=step===2&&!!targetGovernor;
  return {
    mode:showingTarget?"target-governor":"expedition-commander",
    focusOfficer:showingTarget?targetGovernor:sourceCommander,
    targetOfficers:showingTarget?targetOfficers.slice(0,3):[],
    sourceCommander
  };
}
