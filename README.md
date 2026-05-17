## Prompts I used

*(Sorry -- I dictate using [Handy](handy.computer) so my prompts are rambly. I didn't have time to make them shorter 🤷‍♀️ and Claude doesn't mind the length.)*

Hi, I just discovered that there's no good, simple, Mac OS free open source app that allows you to drag in a set of selected
  images or a whole folder and batch update the date times, the creation date times of all of those images. to a particular
  point. Your task is to create this app. Please help me plan it out. It should be simple. It should probably be Electron just
  because I wish we had something more lightweight, but I don't have faith in the tooling to quickly build out something more
  lightweight. I've tried Tauri T-A-U-R-I once, but I was very disappointed by the lack of any supported testing flow on Mac OS.
  So it's probably going to be Electron, even though that's a bit heavy. At least there's a good standard toolkit for ensuring
  that it works.

---

Sure, yes, let's support offset mode. And which dates to set? Yes, let's set all three different exif fields and the file
  system creation date. And additionally, when you drag in files, it should preview, it should indicate here's the number of
  files dragged in and here's the current range of date times. that are detected on those files. So for example, the creation
  days, if some are in 2017 and some are in April 2023, it should show that the current creation date is from 2027 or 2017 to
  April 2023 or whatever, so that you can have a sense of what is the current data that you're about to overwrite. yes, we
  absolutely want to bundle exifool, please. And yes, regarding testing, Electron is playwright is what we want for the
  end-to-end testing. And no, we do not need to support batch rename. we do not need to support GPS editing nor format
  conversion. We can s cons consider those later if we really want them. And regarding the app signing. Oh god, I don't want to
  deal with signing, but I do want... I want to put this up on GitHub with a release that people could download and install. And
  yeah, you know, if Mac OS is going to implement its obnoxious gatekeeper restrictions that prevent people from running open
  source Electron apps, then... That's fine. You know, people can need to do some ugly terminal command in order to bypass the
  quarantine. But at least I would like to be able to package this and put it up on GitHub on a downloadable release. I don't
  want to make you or myself run an NPM command in order to open this lightweight GUI app. That's the whole point of a GUI app,
  is that I don't need to access the terminal to open it.

---

Ahh -- please make it headless (if you can) so running tests doesn't interrupt me with UI popups
