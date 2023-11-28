// dispatch() these
import axios from 'axios'

import { domain, endpoints, ES_PATHS } from '../constants'
import { getHeader, getPDSUrl, getFilename, getIn } from '../utils'

import fileSaver from 'file-saver'

// ======================= WGET =======================
const WGET_FILE_MAX_ROWS = 500000

let WGETRows = []

export const WGETCart = (productKeys) => {
    return (dispatch, getState) => {
        if (productKeys == null || productKeys.length === 0) productKeys = ['src']

        const state = getState()
        const cart = state.get('cart').toJS()
        const checkedCart = cart.filter((v) => v.checked === true)

        const tasks = []

        WGETRows = []

        checkedCart.forEach((d) => {
            tasks.push(async () => {
                d.type === 'query'
                    ? await WGETQuery(d.item, productKeys)
                    : WGETImage(d.item, productKeys)
            })
        })

        const callTasks = async () => {
            for (const task of tasks) {
                await task()
            }
            createWGETFile()
        }

        callTasks()
    }
}

const WGETQuery = (item, productKeys) => {
    return new Promise((resolve, reject) => {
        let totalReceived = 0
        let dsl = {
            query: item.query,
            size: 10000,
            _source: ['uri', ES_PATHS.related.join('.')],
        }

        const filter_path = 'filter_path=hits.hits._source,hits.total,_scroll_id'

        axios
            .post(`${domain}${endpoints.search}?scroll=1m&${filter_path}`, dsl, getHeader())
            .then((res) => scroll(res))
            .then((s) => {
                resolve()
            })
            .catch((err) => {
                console.error('ES Download Error')
                console.dir(err)
            })

        const scroll = (res) => {
            if (!res?.data?.hits) {
                reject()
                return
            }

            totalReceived += res.data.hits.hits.length
            res.data.hits.hits.forEach((r) => {
                productKeys.forEach((key) => {
                    let path
                    if (key === 'src') path = getIn(r._source, ES_PATHS.source)
                    else path = getIn(r._source, ES_PATHS.related.concat([key, 'uri']))
                    if (path) {
                        const release_id = getIn(r._source, ES_PATHS.release_id)
                        const filename = getFilename(path)
                        const pdsUri = getPDSUrl(path, release_id)
                        if (filename && pdsUri) WGETRows.push(`wget -nc -O ${filename} ${pdsUri}\n`)
                    }
                })
            })
            if (WGETRows.length > WGET_FILE_MAX_ROWS) createWGETFile()

            if (totalReceived < item.total) {
                return axios
                    .post(
                        `${domain}${endpoints.scroll}?&${filter_path}`,
                        {
                            scroll: '1m',
                            scroll_id: res.data._scroll_id,
                        },
                        getHeader()
                    )
                    .then((response) => {
                        return scroll(response)
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
            }
        }
    })
}
const WGETImage = (item, productKeys) => {
    productKeys.forEach((key) => {
        let path
        if (key === 'src') path = item.uri
        else path = getIn(item.related, [key, 'uri'])
        if (path) {
            const filename = getFilename(path)
            const pdsUri = getPDSUrl(path, item.release_id)
            if (filename && pdsUri) WGETRows.push(`wget -nc -O ${filename} ${pdsUri}\n`)
        }
    })
    return
}

const createWGETFile = () => {
    if (WGETRows.length == 0) {
        alert('Nothing to download.')
        return
    }

    let WGETStr = WGETRows.join('')
    WGETRows = []

    // Windows treats the % character as EOL in batch files, so need to escape it
    if (window.navigator.userAgent.indexOf('Windows') !== -1) WGETStr = WGETStr.replace(/%/g, '%%')

    const blob = new Blob([WGETStr], { type: 'text/plain;charset=utf-8' })
    fileSaver.saveAs(blob, 'atlas_wget_script.bat', true)
}
