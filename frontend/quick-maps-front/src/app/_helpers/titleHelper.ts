import { Title } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

function setTitle(subtitle: string, titleService: Title, translateService: TranslateService): void {
    translateService.get(subtitle).subscribe(translatedSub => {
        translateService.get('TITLE_PATTERN', {subtitle: translatedSub}).subscribe(title => {
            titleService.setTitle(title);
        });
    });
}

export {
    setTitle
}