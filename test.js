const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONNAL_TOKEN
});

const sumBy = (toGroup, toCount) => (acc, val) => ({
    ...acc,
    [toGroup(val)]: (acc[toGroup(val)] || 0) + (toCount(val) || 0),
})

const fromObjectToArray = (keyKeyName, valueKeyName,object) => Object.keys(object)
    .map(key => ({
        [keyKeyName]: key,
        [valueKeyName]: object[key]
    }))

const sumByToArray = (toGroup, toCount) => (acc, val, idx, array) => {
    const internal_acummulator = sumBy(toGroup,toCount)
    if (idx < array.length -1 ) {
        return(internal_acummulator(acc,val,idx, array))
    }
    else {
        return (fromObjectToArray("label", "count",internal_acummulator(acc, val, idx, array)))
    }
}

const keepMaxBy = (maxFn) => (acc, val) => {
    if (maxFn(val) <= maxFn(acc) )
        return(acc)
    else {
        return(val)
    }

}

const isProgressionLabel = x => x.name.match(new RegExp('0:|1:|2:|3:|4:'))

const main = async () => {
    const result = await octokit.request("/repos/Mailoop/app/issues?per_page=500").then(res => res.data);
    console.log(
        result.filter(x => x.repository_url == 'https://api.github.com/repos/Mailoop/app')
            .filter(y => (y.labels || []).some(x => x.name.match(new RegExp('3:')) ))
            .map(x => x.html_url)
            //.filter(isProgressionLabel)
            //.reduce(sumByToArray(x => x.name, x => 1), {})
            //.sort((a, b) => parseInt(b.label[0]) - parseInt(a.label[0]))
        )
}
main()