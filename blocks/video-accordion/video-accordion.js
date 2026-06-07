import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function getYoutubeId(url) {
  const match = url?.match(YT_RE);
  return match ? match[1] : null;
}

/* Build the YouTube poster -> click-to-play iframe inside the right panel. */
function showVideoPoster(videoId, title, container, thumbSrc) {
  container.textContent = '';
  const poster = document.createElement('div');
  poster.className = 'va-video-poster';

  const img = document.createElement('img');
  img.alt = title;
  img.src = thumbSrc || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  const play = document.createElement('div');
  play.className = 'va-big-play';
  play.innerHTML = `<svg viewBox="0 0 40 40" width="80" height="80">
      <circle cx="20" cy="20" r="19" fill="rgba(0,0,0,0.35)"/>
      <circle cx="20" cy="20" r="14" fill="none" stroke="#fff" stroke-width="2"/>
      <polygon points="15,12 30,20 15,28" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;

  poster.append(img, play);
  container.append(poster);

  poster.addEventListener('click', (e) => {
    e.stopPropagation();
    container.textContent = '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    iframe.title = title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    container.append(iframe);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  /* The first row is the hero item; the rest are video items.
     (Order is guaranteed by the authoring model / filter.) */
  const heroRow = rows[0];
  const videoRows = rows.slice(1);

  // ---- Hero: image is the picture cell; title is the rich-text cell. ----
  const heroCells = [...heroRow.children];
  const heroPicture = heroRow.querySelector('picture');
  // Fields are image, alt, title (in order) — title is the last non-empty
  // cell that isn't the image cell.
  const heroTitleCell = heroCells
    .filter((c) => !c.querySelector('picture') && c.textContent.trim() !== '')
    .pop();

  // ---- Build the shell. ----
  const left = document.createElement('div');
  left.className = 'va-left';
  const list = document.createElement('ul');
  list.className = 'va-accordion';
  left.append(list);

  const right = document.createElement('div');
  right.className = 'va-right';
  const media = document.createElement('div');
  media.className = 'va-media-container';
  right.append(media);

  const heroMobile = document.createElement('div');
  heroMobile.className = 'va-hero-mobile';

  const showHeroImage = () => {
    media.textContent = '';
    if (heroPicture) media.append(heroPicture.cloneNode(true));
  };

  // ---- Hero accordion item (preserve instrumentation from the source row). ----
  const heroItem = document.createElement('li');
  heroItem.className = 'va-item va-hero va-active';
  moveInstrumentation(heroRow, heroItem);

  const heroHeader = document.createElement('div');
  heroHeader.className = 'va-item-header';
  const heroTitleSpan = document.createElement('span');
  heroTitleSpan.className = 'va-item-title';
  if (heroTitleCell) {
    // Move the real title node so its richtext instrumentation survives.
    while (heroTitleCell.firstChild) heroTitleSpan.append(heroTitleCell.firstChild);
    moveInstrumentation(heroTitleCell, heroTitleSpan);
  }
  const heroChevron = document.createElement('span');
  heroChevron.className = 'va-chevron';
  heroHeader.append(heroTitleSpan, heroChevron);

  const heroBody = document.createElement('div');
  heroBody.className = 'va-item-body';
  heroItem.append(heroHeader, heroBody);
  list.append(heroItem);

  // Mobile hero title mirrors the same content.
  heroMobile.innerHTML = heroTitleSpan.innerHTML;
  showHeroImage();

  // Video items.
  videoRows.forEach((row) => {
    const cells = [...row.children];
    // The video link lives in the first cell (model field order: link first).
    const linkCell = cells[0];
    const link = linkCell?.querySelector('a');
    const videoId = getYoutubeId(link?.href || link?.textContent);

    // Thumbnail picture if authored; otherwise derive from YouTube.
    const thumbPicture = row.querySelector('picture');
    const ytThumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';

    // Remaining text cells, in author order, excluding media/link cells.
    const textCells = cells
      .slice(1)
      .filter((c) => !c.querySelector('picture') && c.textContent.trim() !== '');
    const titleCell = textCells[0];
    const descCell = textCells[1];
    const title = titleCell ? titleCell.textContent.trim() : '';

    const li = document.createElement('li');
    li.className = 'va-item va-video';
    moveInstrumentation(row, li);

    // thumb
    const thumb = document.createElement('div');
    thumb.className = 'va-thumb';
    if (thumbPicture) {
      thumb.append(thumbPicture.cloneNode(true));
    } else if (ytThumb) {
      const optimized = createOptimizedPicture(ytThumb, title, false, [{ width: '320' }]);
      thumb.append(optimized);
    }
    const playIcon = document.createElement('span');
    playIcon.className = 'va-play-icon';
    playIcon.innerHTML = `<svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="19" fill="rgba(0,0,0,0.35)"/>
        <circle cx="20" cy="20" r="14" fill="none" stroke="#fff" stroke-width="2"/>
        <polygon points="15,12 30,20 15,28" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      </svg>`;
    const overlay = document.createElement('div');
    overlay.className = 'va-overlay';
    thumb.append(playIcon, overlay);

    // header
    const header = document.createElement('div');
    header.className = 'va-item-header';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'va-item-title';
    if (titleCell) {
      while (titleCell.firstChild) titleSpan.append(titleCell.firstChild);
      moveInstrumentation(titleCell, titleSpan);
    } else {
      titleSpan.textContent = title;
    }
    const chevron = document.createElement('span');
    chevron.className = 'va-chevron';
    chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M30.48 7.24l-14.48 14.48-14.48-14.48-1.52 1.52 16 16 16-16z"/></svg>';
    header.append(titleSpan, chevron);

    // body
    const body = document.createElement('div');
    body.className = 'va-item-body';
    if (descCell) {
      while (descCell.firstChild) body.append(descCell.firstChild);
      moveInstrumentation(descCell, body);
    }

    li.append(thumb, header, body);
    list.append(li);

    const resolvedThumbSrc = thumbPicture?.querySelector('img')?.src || ytThumb;

    li.addEventListener('click', () => {
      const alreadyOpen = li.classList.contains('va-active');
      list.querySelectorAll('.va-item.va-video').forEach((v) => v.classList.remove('va-active'));
      if (!alreadyOpen) {
        li.classList.add('va-active');
        heroItem.classList.remove('va-active');
        if (videoId) {
          showVideoPoster(videoId, title, media, resolvedThumbSrc);
        } else if (resolvedThumbSrc) {
          media.textContent = '';
          const img = document.createElement('img');
          img.src = resolvedThumbSrc;
          img.alt = title;
          media.append(img);
        }
      } else {
        heroItem.classList.add('va-active');
        showHeroImage();
      }
    });
  });

  // ---- Swap the block contents for the assembled structure. ----
  block.textContent = '';
  block.classList.add('va-block');
  block.append(left, right, heroMobile);
}
