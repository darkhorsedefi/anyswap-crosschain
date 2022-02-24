import { useEffect, useState } from 'react'
import { AppData } from '../state/application/actions'
import { useStorageContract } from './useContract'
import config from '../config'
import { ZERO_ADDRESS } from '../constants'

const parseInfo = (info: string) => {
  const parsed = {
    logo: '',
    projectName: ''
  }
  const result = JSON.parse(info)

  if (Object.keys(result)) {
    const { logoUrl, projectName } = result

    if (logoUrl) parsed.logo = logoUrl
    if (projectName) parsed.projectName = projectName
  }

  return parsed
}

export default function useAppData(): {
  data: AppData | null
  isLoading: boolean
  error: Error | null
} {
  const [data, setData] = useState<AppData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const storage = useStorageContract(config.STORAGE_CHAIN_ID)

  useEffect(() => {
    const fetchData = async () => {
      if (!storage) return

      setError(null)
      setIsLoading(true)

      try {
        const domain = window.location.hostname || document.location.host
        const data = await storage.methods.getData(domain).call()
        const { owner, info } = data

        setData({
          ...parseInfo(info || '{}'),
          owner: owner === ZERO_ADDRESS ? '' : owner
        })
      } catch (error) {
        console.group('%c app data', 'color: red;')
        console.error(error)
        console.groupEnd()
        setError(error)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [])

  return { data, isLoading, error }
}
