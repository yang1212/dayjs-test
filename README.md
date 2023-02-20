## [中文文档](https://dayjs.fenxianglu.cn/category/timezone.html#%E8%A7%A3%E6%9E%90%E6%97%B6%E5%8C%BA)
* 🕒 Familiar Moment.js API & patterns
* 💪 Immutable
* 🔥 Chainable
* 🌐 I18n support
* 📦 2kb mini library
* 👫 All browsers supported

---

## Getting Started

### Documentation

You can find for more details, API, and other docs on [day.js.org](https://day.js.org/) website.

### Installation

```console
npm install dayjs --save
```

📚[Installation Guide](https://day.js.org/docs/en/installation/installation)

### API

It's easy to use Day.js APIs to parse, validate, manipulate, and display dates and times.

```javascript
dayjs('2018-08-08') // parse

dayjs().format('{YYYY} MM-DDTHH:mm:ss SSS [Z] A') // display

dayjs().set('month', 3).month() // get & set

dayjs().add(1, 'year') // manipulate

dayjs().isBefore(dayjs()) // query
```

📚[API Reference](https://day.js.org/docs/en/parse/parse)

### I18n

Day.js has great support for internationalization.

But none of them will be included in your build unless you use it.

```javascript
import 'dayjs/locale/es' // load on demand

dayjs.locale('es') // use Spanish locale globally

dayjs('2018-05-05').locale('zh-cn').format() // use Chinese Simplified locale in a specific instance
```
📚[Internationalization](https://day.js.org/docs/en/i18n/i18n)

### Plugin

A plugin is an independent module that can be added to Day.js to extend functionality or add new features.

```javascript
import advancedFormat from 'dayjs/plugin/advancedFormat' // load on demand

dayjs.extend(advancedFormat) // use plugin

dayjs().format('Q Do k kk X x') // more available formats
```

📚[Plugin List](https://day.js.org/docs/en/plugin/plugin)

